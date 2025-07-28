const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    profile_image: {
      type: String,
      
    },
    is_approved: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // phone: {
    //   type: Number,
    // },
    // address: {
    //   type: String,
    // },
    profile_completd: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, null, (error, newHash) => {
    if (error) {
      return next(error);
    }
    user.password = newHash;
    return next();
  });
};

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err);
    }
    return hash(user, salt, next);
  });
};

UserSchema.pre("save", function (next) {
  const that = this;
  const SALT_FACTOR = 5;

  if (that.isModified("first_name") || that.isModified("last_name")) {
    that.full_name = `${this.first_name} ${this.last_name}`;
  }

  if (!that.isModified("password")) {
    return next();
  }

  return genSalt(that, SALT_FACTOR, next);
});

UserSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  );
};

module.exports = mongoose.model("user", UserSchema);
