function write(level, event, details = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  const output = JSON.stringify(record);
  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

function createLogger() {
  return {
    error: (event, details) => write("error", event, details),
    info: (event, details) => write("info", event, details),
  };
}

module.exports = { createLogger };

