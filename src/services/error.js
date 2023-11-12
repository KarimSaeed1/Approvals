const AppError = require("./appError");

//For invalid fields like id
const handleCastErrorDB = (err) => {
  const message = `غير صالح ${err.path} : ${err.value} .`;
  return new AppError(message, 404);
};

//For unique fieldss
const handleDuplicateFieldsDB = (err) => {
  const fieldNames = Object.keys(err.keyValue);

  const message = `${fieldNames.join(', ')} موجودة بالفعل. يرجى إدخال قيمة جديدة`;
  return new AppError(message, 400);
};

//For validation errors
const handleValidationErrorsDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = ` ${errors.join(" .")}`;
  return new AppError(message, 403);
};

//For jwt invalid error
const handleJsonWebTokenError = () => {
  return new AppError("من فضلك قم باعاده تسجيل الدخول مره اخرى", 401);
};

//For jwt expire error
const handleTokenExpiredError = () => {
  return new AppError("من فضلك قم باعاده تسجيل الدخول مره اخرى", 401);
};

//For multer upload error
const handleMulterLimitError = () => {
  return new AppError("عدد الصور كثير ", 400);
};


//Send error in development mode
const sendErrorInDevelopment = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

//Send error in production mode
const sendErrorInProduction = (err, res) => {
  if (err.isOperational) {
    //operational error
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("Error : ", err);
    // programming or unknown error
    res.status(500).json({
      status: "error",
      message: "something went very wrong !",
    });
  }
};


module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorInDevelopment(err, res);
  } else if (process.env.NODE_ENV === "production") {
    if (err.name === "CastError") err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") err = handleValidationErrorsDB(err);
    if (err.name == "JsonWebTokenError") err = handleJsonWebTokenError();
    if (err.name == "TokenExpiredError") err = handleTokenExpiredError();
    if (err.code == "LIMIT_UNEXPECTED_FILE") err = handleMulterLimitError();

    sendErrorInProduction(err, res);
  }
};
