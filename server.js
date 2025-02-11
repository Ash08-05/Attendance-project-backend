const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const pool = require("./db"); // Correct import of the database pool

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // Middleware to parse JSON
app.use(cors({
  origin: "https://attendance-portal-test.netlify.app", // Replace with your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  credentials: true // Allow cookies if needed
}));



// ✅ API to Get All Employees
app.get("/employees", async (req, res) => {
  console.log("GET /employees called");
  try {
    const [employees] = await pool.query("SELECT * FROM employees");
    console.log("Employees fetched:", employees);
    res.status(200).json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ API to Add Employee
app.post("/employees", async (req, res) => {
  const { name, employee_id, department, designation } = req.body;
  const sql = "INSERT INTO employees (name, employee_id, department, designation) VALUES (?, ?, ?, ?)";

  try {
    const [result] = await pool.query(sql, [name, employee_id, department, designation]);
    res.json({ message: "Employee added successfully!", id: result.insertId });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ API to Delete Employee
app.delete("/employees/:id", async (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM employees WHERE id = ?";

  try {
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ error: "Database error" });
  }
});

//POST ATTENDANCE
// API to Get All Attendance Records
app.get("/attendance", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT attendance.id, employees.name AS employee_name, attendance.date, attendance.status
      FROM attendance
      JOIN employees ON attendance.employee_id = employees.id
      ORDER BY attendance.date DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching attendance:", err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});


// API to Mark Attendance
app.post("/attendance", async (req, res) => {
  const { employee_id, date, status } = req.body;

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: "Missing required fields" }); 
  }

  try {
    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, ?)",
      [employee_id, date, status]
    );
    connection.release();
    res.json({ message: "Attendance added successfully" });
  } catch (error) {
    console.error("Error adding attendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




//PUT ATTENDANCE
app.put("/attendance/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const sql = "UPDATE attendance SET status = ? WHERE id = ?";
    const [result] = await pool.query(sql, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({ message: "Attendance updated successfully!" });
  } catch (err) {
    console.error("Error updating attendance:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//DELETE ATTENDANCE
app.delete("/attendance/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const sql = "DELETE FROM attendance WHERE id = ?";
    const [result] = await pool.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    res.json({ message: "Attendance record deleted successfully!" });
  } catch (err) {
    console.error("Error deleting attendance:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}); 



// Overtime 
//GET OVERTIME 
// GET Overtime Data
app.get("/overtime", async (req, res, next) => {
  try {
    const sql = `
      SELECT overtime.id, employees.name AS employee_name, overtime.date, overtime.hours
      FROM overtime
      JOIN employees ON overtime.employee_id = employees.id;
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching overtime data:", error.message);
    next(error);
  }
});


// POST Overtime Data
app.post("/overtime", async (req, res) => {
  console.log("Received request:", req.body); // Debugging incoming data

  const { employee_id, date, hours } = req.body;

  if (!employee_id || !date || !hours) {
    console.error("Missing fields:", req.body);
    return res.status(400).json({ error: "Please provide all fields: employee_id, date, and hours." });
  }

  try {
    const sql = "INSERT INTO overtime (employee_id, date, hours) VALUES (?, ?, ?)";
    const [result] = await pool.query(sql, [employee_id, date, hours]); // Using `pool.query`

    res.json({ message: "Overtime added successfully!", id: result.insertId });
  } catch (error) {
    console.error("SQL Insert Error:", error.message);
    res.status(500).json({ error: "Database error while adding overtime.", details: error.message });
  }
});

// DELETE Overtime Entry
app.delete("/overtime/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM overtime WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Overtime entry not found." });
    }

    res.json({ message: "Overtime entry deleted successfully!" });
  } catch (error) {
    console.error("Error deleting overtime:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});


//Reports 

app.get("/report", async (req, res) => {
  const query = `
      SELECT 
          e.id AS employee_id,
          e.name AS employee_name,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 ELSE NULL END) AS total_present,
          COUNT(CASE WHEN a.status = 'Absent' THEN 1 ELSE NULL END) AS total_absent,
          COUNT(CASE WHEN a.status = 'On Leave' THEN 1 ELSE NULL END) AS total_leave,
          COALESCE(SUM(o.hours), 0) AS total_overtime
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      LEFT JOIN overtime o ON e.id = o.employee_id
      GROUP BY e.id, e.name
      ORDER BY e.name;
  `;

  try {
      const connection = await pool.getConnection(); // Get a connection from the pool
      const [results] = await connection.query(query); // Execute query
      connection.release(); // Release connection
      res.json(results); // Send the data as JSON
  } catch (err) {
      console.error("Error fetching reports:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Route to generate and download a PDF report
app.get("/download-report", async (req, res) => {
  const query = `
      SELECT employees.name AS employee_name, attendance.date, attendance.status, overtime.hours
      FROM employees
      LEFT JOIN attendance ON employees.id = attendance.employee_id
      LEFT JOIN overtime ON employees.id = overtime.employee_id
      ORDER BY attendance.date DESC;
  `;

  try {
      const connection = await pool.getConnection();
      const [results] = await connection.query(query);
      connection.release(); // Release the connection

      // Generate PDF
      const doc = new PDFDocument();
      const filePath = "report.pdf";
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);
      doc.fontSize(18).text("Attendance & Overtime Report", { align: "center" });
      doc.moveDown();

      results.forEach((row, index) => {
          doc.fontSize(12).text(`${index + 1}. ${row.employee_name}`);
          doc.text(`Date: ${row.date}`);
          doc.text(`Attendance: ${row.status}`);
          doc.text(`Overtime Hours: ${row.hours || "0"}`);
          doc.moveDown();
      });

      doc.end();

      writeStream.on("finish", () => {
          res.download(filePath, "report.pdf", (err) => {
              if (err) {
                  console.error("Error sending file:", err);
                  return res.status(500).json({ error: "Error generating report" });
              }
              fs.unlinkSync(filePath); // Delete the file after sending
          });
      });
  } catch (err) {
      console.error("Error fetching reports:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

//Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
