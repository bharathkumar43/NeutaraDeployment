"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) and PDFs are allowed'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
    fileFilter,
});
//# sourceMappingURL=upload.js.map