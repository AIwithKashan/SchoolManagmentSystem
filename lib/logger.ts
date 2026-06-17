const log = {
  error: (msg: string, data?: any) => console.error(msg, data),
  warn: (msg: string, data?: any) => 
    process.env.NODE_ENV !== "production" && console.warn(msg, data),
  info: (msg: string, data?: any) => 
    process.env.NODE_ENV !== "production" && console.log(msg, data),
};

export default log;
