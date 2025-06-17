const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.headers["jwt-token"];
    if (!token) {
        return res.send({ msg: "Token Is Missing" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
    } catch (err) {
        return res.send({ msg: err });
    }
    return next();
};

module.exports = verifyToken;