const mongoose = require('mongoose')
const crypto = require('crypto')
const secret = process.env.JWT_SECRET
const algorithm = 'aes-256-cbc'
const key = crypto.scryptSync(secret, 'salt', 32)
const iv = Buffer.alloc(16, 0) 
const jwt = require('jsonwebtoken')
const jwt_secret = process.env.JWT_SECRET
const sharp = require("sharp");


exports.handleError = (res, err) => {
    console.log(err)
  function getValidCode(code) {
    code = parseInt(code);
    const isValid = code >= 100 && code < 600;
    return isValid ? code : 500
  }

  res.status(getValidCode(err?.code)).json({
    errors: {
      msg: err.message
    },
    code: getValidCode(err?.code)
  })
}
exports.checkPassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        console.log('err---->', err);
        reject(this.buildErrObject(422, err.message))
      }
      console.log('isMatch--xxxxxxxxx-------->', isMatch);
      if (!isMatch) {
        resolve(false)
      }
      resolve(true)
    })
  })
}
exports.encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

exports.decrypt = (encryptedText) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
exports.generateJwtToken = (
  _id ,
  type,
  expiresIn
)=> {
  const payload = {
    _id,
    type,
  };

  const options= {
    expiresIn: expiresIn,
  };

  const token= jwt.sign(payload, jwt_secret, options);
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
};
exports.generateOTP = (length= 6)=> {
  const digits = "0123456789";
  let otp = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    const randomIndex = bytes[i] % digits.length;
    otp += digits[randomIndex];
  }
  return otp;
};
const changeNameToWebpExtension = (filename) => {
  return filename.replace(/\.[^.]+$/, ".webp");
};
async function uploadFile(object) {
  return new Promise((resolve, reject) => {
    const { file, path } = object;
    const filename = `${Date.now()}_${file.name}`;

    if (!file.mv) {
      return reject({ message: "mv not found on uploaded file", code: 400 });
    }

    file.mv(`${path}/${filename}`, (err) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      resolve(filename);
    });
  });
}


exports.uploadImage = async (object) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { file } = object;
      const nameWithWebpExtension = changeNameToWebpExtension(file.name);
      const imageDataBuffer = file.data;

      const webpBuffer = await sharp(imageDataBuffer)
        .toFormat("webp", { lossless: false })
        .toBuffer();

      object.file.name = nameWithWebpExtension;
      object.file.data = webpBuffer;

      const name = await uploadFile(object);
      resolve(name);
    } catch (conversionError) {
      console.error("Error converting image to WebP:", conversionError);
      reject(conversionError);
    }
  });
};
exports.uploadFileOrVideo = async (object) => {
  return new Promise(async (resolve, reject) => {
    try {
      const name = await uploadFile(object);
      resolve(name);
    } catch (error) {
      reject(error);
    }
  });
};
exports.generate8CharAlphanumericPassword= function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
exports.generateBookingId = () => {
  const prefix = "BOOKING";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomPart = Array.from({ length: 8 }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
  
  return prefix + randomPart;
};