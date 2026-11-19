function write(level, event, fields = {}) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        event,
        ...fields,
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
        console.error(line);
    }
    else if (level === "warn") {
        console.warn(line);
    }
    else {
        console.log(line);
    }
}
export const verificationLog = {
    debug: (event, fields) => write("debug", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
};
//# sourceMappingURL=structured-logger.js.map