import {Sequelize} from "sequelize"
 
const sequelize = new Sequelize(
  "whiteray_tech",
  "whiteray_root",
  "Root$34#W",
  {
    host: "localhost",
    dialect: "mysql",
    timezone: "+05:30", // IST timezone
    dialectOptions: {
      useUTC: false,
      timezone: "+05:30"
    }
  }
);   

export default sequelize;
 