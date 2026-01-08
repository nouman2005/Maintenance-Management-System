import express from "express";
import dotenv, { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import ConnectDB from "./Config/db.js";
import adminRoutes from "./Routes/adminRoutes.js";
import flatRoutes from "./Routes/flatRoutes.js";
import tenantRoutes from "./Routes/tenantRoutes.js";
import maintenanceSettingRoutes from "./Routes/maintenanceSettingRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://192.168.1.34:4000", "http://localhost:5173"],
    credentials: true,
    methods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(morgan("dev"));

app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/flats", flatRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/maintenance-settings", maintenanceSettingRoutes);

app.get("/", (req, res) => {
  res.send("<h1>SuccessFully Connected</h1>");
});

app.listen(process.env.PORT, () => {
  console.log(`✅ Server Running At Port ${process.env.PORT}`);
});
