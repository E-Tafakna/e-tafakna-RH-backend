const express = require("express");
const http = require("http");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const cors = require("cors");
const paginate = require("express-paginate");
const app = express();
const server = http.createServer(app);


const employeesRoutes = require("./routes/employees/employees.routes");
const documentTemplatesRoutes = require("./routes/documentTemplates/documentTemplates.routes");
const requestsRoutes = require("./routes/Requests/requests.routes");
const documentsRoutes = require("./routes/Documents/documents.routes");
const reclamationsRoutes = require("./routes/Reclamations/reclamations.routes");
const auditLogsRoutes = require("./routes/AuditLogs/AuditLogs.routes");
const creditRequestRoutes = require('./routes/creditRequest/creditRequestRoutes');
const creditPolicyRoutes = require('./routes/creditPolicy/creditPolicyRoutes');
const leaveRequestRoutes = require('./routes/leaveRequest/leaveRequestRoutes');
const documentRequestRoutes = require('./routes/documentRequest/documentRequestRoutes');
const advanceRequestRoutes = require('./routes/advanceRequest/advanceRequestRoutes');
const docToPrintRoutes = require('./routes/docToPrint/docToPrintRoutes');
const companyRoutes = require('./routes/company/companyRoutes');
const advancePolicyRoutes = require('./routes/advancePolicy/advancePolicyRoutes');
const leavePolicyRoutes = require('./routes/leavePolicy/leavePolicyRoutes');
const depotRequestsRoutes = require('./routes/DepotRequests/depotRequests.routes');
const notificationsRoutes = require('./routes/Notifications/notifications.routes');


var io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3068;

app.disable('etag');

// Pass io to your routesssssss
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // Adjust limit as necessary

app.use(cors({
  origin: '*',
}));

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "50mb" })); // Adjust limit as necessary
//app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream' }));
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use(paginate.middleware(10, 50));
app.use("/uploads", express.static("./uploads"));

app.use("/api/v1/employees", employeesRoutes);
app.use("/api/v1/documentTemplates", documentTemplatesRoutes);
app.use("/api/v1/requests", requestsRoutes);
app.use("/api/v1/documents", documentsRoutes);
app.use("/api/v1/reclamations", reclamationsRoutes);
app.use("/api/v1/auditLogs", auditLogsRoutes);
app.use('/api/credit-requests', creditRequestRoutes);
app.use('/api/credit-policies', creditPolicyRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/document-requests', documentRequestRoutes);
app.use('/api/advance-requests', advanceRequestRoutes);
app.use('/api/docs-to-print', docToPrintRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/advance-policy', advancePolicyRoutes);
app.use('/api/leave-policy', leavePolicyRoutes);
app.use('/api/depot-requests', depotRequestsRoutes);
app.use('/api/notifications', notificationsRoutes);


app.get("/", (req, res) => {
  res.send("Welcome To E-Tafakna RH ");
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });
  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
  });
});

server.listen(PORT, function () {
  console.log(`Server running on ${PORT}`);
});
