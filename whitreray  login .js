//developed by Taran Singh


import { DataTypes } from "sequelize";
import sequelize from "../database/DB.js";

const AdminPermission = sequelize.define(
  "AdminPermission",

  { 
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    adminId: {
      type: DataTypes.INTEGER,  
      allowNull: false,
    },

    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    courses: {
      type: DataTypes.JSON,
      defaultValue: {
        enabled: false,
        view: false,
        add: false,
        edit: false,
        delete: false,
      },
    },

    students: {
      type: DataTypes.JSON,
      defaultValue: {
        enabled: false,
        view: false,
        add: false,
        edit: false,
        delete: false,
      },
    },


    staff: {
      type: DataTypes.JSON,
      defaultValue: {
        enabled: false,
        view: false,
        add: false,
        edit: false,
        delete: false,
      },
    },

    reports: {
      type: DataTypes.JSON,
      defaultValue: {
        enabled: false,
        view: false,
        add: false,
        edit: false,
        delete: false,
      },
    },

   receipts: {
  type: DataTypes.JSON,
  defaultValue: {
    enabled: false,
    view: false,
    add: false,
  },
},
 refunds: {
  type: DataTypes.JSON,
  defaultValue: {
    enabled: false,
    view: false,
    add: false,
    edit: false,
    delete: false,
  },
},

 

    discounts: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "admin_permissions",
    timestamps: true,
  }
);

export default AdminPermission;
//done

 