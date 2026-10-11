import crypto from "crypto";
import { validationResult } from "express-validator";
import db from "../Config/db.js";
import { prefixedNanoId } from "../Utils/nanoId.js";

const scope = (req) => ({ societyId: req.user?.society_id, adminId: req.user?.id });
const money = (value) => Number(Number(value).toFixed(2));

const getAffectedFlats = async (societyId, revisionType, increaseAmount, connection = db) => {
  const [flats] = await connection.query(
    `SELECT id, wing, flat_no, area_sqft, maintenance_amount
     FROM flats
     WHERE society_id = ? AND status = 'active'
       AND (? = 'fixed_increase' OR COALESCE(area_sqft, 0) > 0)
     ORDER BY wing, flat_no`,
    [societyId, revisionType],
  );
  return flats.map((flat) => {
    const increase = revisionType === "per_sqft_increase"
      ? money(Number(flat.area_sqft) * Number(increaseAmount))
      : money(increaseAmount);
    return {
      ...flat,
      previous_amount: money(flat.maintenance_amount),
      increase_amount: increase,
      new_amount: money(Number(flat.maintenance_amount) + increase),
    };
  });
};

export const previewMaintenanceRevision = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { societyId } = scope(req);
  if (!societyId) return res.status(403).json({ success: false, message: "Admin society is missing. Please login again." });
  try {
    const flats = await getAffectedFlats(societyId, req.body.revision_type, req.body.increase_amount);
    const totals = flats.reduce((result, flat) => ({
      current_monthly: result.current_monthly + flat.previous_amount,
      revised_monthly: result.revised_monthly + flat.new_amount,
      monthly_increase: result.monthly_increase + flat.increase_amount,
    }), { current_monthly: 0, revised_monthly: 0, monthly_increase: 0 });
    return res.json({ success: true, data: { flats, affected_flats: flats.length, totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, money(value)])) } });
  } catch (error) {
    console.error("PREVIEW MAINTENANCE REVISION ERROR:", { societyId, code: error.code, message: error.message });
    return res.status(500).json({ success: false, message: "Unable to preview maintenance revision" });
  }
};

export const applyMaintenanceRevision = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { societyId, adminId } = scope(req);
  if (!societyId) return res.status(403).json({ success: false, message: "Admin society is missing. Please login again." });
  const { name, revision_type, increase_amount, effective_from, reason, notes = null } = req.body;
  const requestKey = crypto.createHash("sha256").update([societyId, name.trim(), revision_type, increase_amount, effective_from, reason.trim()].join("|")) .digest("hex");
  try {
    await db.beginTransaction();
    const [[duplicate]] = await db.query(
      "SELECT id FROM maintenance_revisions WHERE society_id = ? AND request_key = ? FOR UPDATE",
      [societyId, requestKey],
    );
    if (duplicate) {
      await db.rollback();
      return res.status(409).json({ success: false, message: "This maintenance revision has already been applied." });
    }
    const flats = await getAffectedFlats(societyId, revision_type, increase_amount, db);
    if (!flats.length) {
      await db.rollback();
      return res.status(400).json({ success: false, message: "No eligible active flats were found for this revision." });
    }
    const [revision] = await db.query(
      `INSERT INTO maintenance_revisions
       (revision_code, society_id, admin_id, name, revision_type, increase_amount, effective_from, reason, notes, request_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [prefixedNanoId("REV"), societyId, adminId, name.trim(), revision_type, increase_amount, effective_from, reason.trim(), notes?.trim() || null, requestKey],
    );
    for (const flat of flats) {
      await db.query(
        `INSERT INTO maintenance_revision_items
         (revision_id, society_id, flat_id, previous_amount, increase_amount, new_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [revision.insertId, societyId, flat.id, flat.previous_amount, flat.increase_amount, flat.new_amount],
      );
      await db.query(
        `INSERT INTO flat_maintenance_amount_history
         (society_id, flat_id, revision_id, maintenance_amount, effective_from, reason, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [societyId, flat.id, revision.insertId, flat.new_amount, effective_from, reason.trim(), adminId],
      );
      await db.query("UPDATE flats SET maintenance_amount = ? WHERE id = ? AND society_id = ?", [flat.new_amount, flat.id, societyId]);
    }
    await db.commit();
    return res.status(201).json({ success: true, message: "Maintenance revision applied", data: { revision_id: revision.insertId, affected_flats: flats.length } });
  } catch (error) {
    await db.rollback();
    console.error("APPLY MAINTENANCE REVISION ERROR:", { societyId, code: error.code, message: error.message });
    return res.status(500).json({ success: false, message: "Unable to apply maintenance revision" });
  }
};

export const getMaintenanceRevisions = async (req, res) => {
  const { societyId } = scope(req);
  if (!societyId) return res.status(403).json({ success: false, message: "Admin society is missing. Please login again." });
  try {
    const [rows] = await db.query(
      `SELECT mr.*, a.name AS admin_name, COUNT(mri.id) AS affected_flats
       FROM maintenance_revisions mr
       LEFT JOIN maintenance_revision_items mri ON mri.revision_id = mr.id
       LEFT JOIN admins a ON a.id = mr.admin_id AND a.society_id = mr.society_id
       WHERE mr.society_id = ?
       GROUP BY mr.id
       ORDER BY mr.effective_from DESC, mr.id DESC`,
      [societyId],
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("GET MAINTENANCE REVISIONS ERROR:", { societyId, code: error.code, message: error.message });
    return res.status(500).json({ success: false, message: "Unable to fetch maintenance revisions" });
  }
};
