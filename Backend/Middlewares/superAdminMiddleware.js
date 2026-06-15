export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin access only",
    });
  }

  next();
};
