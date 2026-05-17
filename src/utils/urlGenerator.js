//This function converts a file (like image) into a Data URI (base64 string)
const DatauriParser = require("datauri/parser")
const path = require("path")

const getDataUri = (file) => {
    const parser = new DatauriParser()
    const extName = path.extname(file.originalname).toString()
    return parser.format(extName, file.buffer)
}

module.exports = getDataUri