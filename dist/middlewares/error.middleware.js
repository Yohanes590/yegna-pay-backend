export const errorMiddleware = ((err, req, res, next) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: "Bad Request",
            message: "Invalid JSON payload"
        });
    }
    console.error("Server error:", err?.stack || err?.message || err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err?.message || "An unexpected error occurred"
    });
});
//# sourceMappingURL=error.middleware.js.map