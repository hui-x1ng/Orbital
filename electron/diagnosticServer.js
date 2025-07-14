const WebSocket = require('ws');

let server = null;

function startServer(port = 8080) {
  if (server) return;
  server = new WebSocket.Server({ port });
  console.log('[LSP Bridge] Server listening on port', port);

  server.on('connection', (ws) => {
    console.log('[LSP Bridge] Extension connected');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Hello from Tamacodechi!' }));

    //categorizing message received 
    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message.toString());
            console.log('[LSP Bridge] Received:', parsed);

            const { type, data } = parsed;

            switch (type) {
            case 'debug_session_start':
                handleSessionStart(data);
                break;

            case 'debug_session_end':
                handleSessionEnd(data);
                break;

            case 'diagnostic_update':
                handleDiagnostic(data);
                break;

            case 'runtime_error':
                handleRuntimeError(data);
                break;

            default:
                console.log('[LSP Bridge] Unknown message type:', type);
                break;
            }

        } catch (err) {
            console.error('[LSP Bridge] Invalid JSON:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
        });
  });
}

function stopServer() {
  if (server) {
    console.log('[LSP Bridge] Shutting down...');
    server.close(() => {
      console.log('[LSP Bridge] Server closed');
    });
    server = null;
  }
}

module.exports = { startServer, stopServer };


function handleSessionStart(data) {
  console.log('[Pet] 🐛 Debug session started:', data.name);
}

function handleSessionEnd(data) {
  console.log('[Pet] ✅ Debug session ended.');
}

function handleDiagnostic(data) {
  const diagnostics = data.diagnostics || [];
  diagnostics.forEach((diag) => {
    console.log(`[Pet] 📋 Diagnostic: ${diag.message} (Severity: ${diag.severity})`);
  });
}

function handleRuntimeError(data) {
  console.log(`[Pet] 💥 Runtime Error: ${data.message} at line ${data.line}, column ${data.column}`);
}
