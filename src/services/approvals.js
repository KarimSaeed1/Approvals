// Libraries
const mongoose = require("mongoose");

// Features
const catchAsync = require("./catchAsync")
const AppError = require("./appError")

// Classess
const API = require("./apiHandler")

// Objects
const apiHandler = new API();


// Approval model
const approvalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: [],
    },

    accountAdmin: mongoose.Schema.ObjectId,

    approvals: [
      {
        level: {
          type: Number,
          required: ["true"],
        },

        users: [mongoose.Schema.ObjectId],

        groups: [
          {
            type: mongoose.Schema.ObjectId,
            ref: "Group",
          },
        ],

        condition: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

approvalSchema.pre(/^find/, function (next) {
  this.populate({
    path: "approvals.groups",
    select: "name",
  });

  next();
});

const Approval = mongoose.model("Approval", approvalSchema);


//GET
exports.getMyApprovals = catchAsync(async (req, res, next) => {

apiHandler.getAll(Approval,{accountAdmin : req.user.accountAdmin});

});

exports.getApprovalByID = catchAsync(async (req, res, next) => {

apiHandler.getOne(Approval,{id : req.params.id , accountAdmin : req.user.accountAdmin});

});

exports.getApprovalByName = catchAsync(async (req, res, next) => {``
const query = {
    name: req.query.name,
    accountAdmin: req.user.accountAdmin
};

apiHandler.getOne(Approval,query);

});

//POST
exports.addApproval = catchAsync(async (req, res, next) => {

const query = {
    name: req.body.name,
    accountAdmin: req.user.id,
};

const data = {
    name: req.body.name,
    accountAdmin: req.user.id,
}

const approvalFound = await Approval.findOne(query).lean();

if (approvalFound) {
    return next(new AppError("This approval added before*#*تمت اضافة موافقة طلب السعر هذا مسبقا", 400));
}

apiHandler.create(Approval,data)

});

//PATCH
exports.addApprovalLevels = catchAsync(async (req, res, next) => {

let groupFound , i , max , maxLevel ;

const {users ,groups, condition} = req.body;

const approval = await Approval.findById(req.params.id).select("approvals");
const approvals = approval.approvals;

if (groups) {
    for (i = 0; i <= groups.length - 1; i++) {
    groupFound = await Group.findOne({
        accountAdmin: req.user.id,
        id: groups[i],
    });
    if (groupFound == null) {
        return next(new AppError("You should choose an exist group name*#*يجب ان تختار اسم مجموعة موجودة", 400));
    }
}
}

if (approvals.length == 0) {
    approvals.push({
    level: 1,
    users: users,
    groups: groups,
    condition: condition,
    });
    await approval.save();
} else {

    max = Math.max(...approvals.map((o) => o.condition));
    maxLevel = Math.max(...approvals.map((o) => o.level));
    if (condition <= max) {
    return next(
        new AppError(
        "Condition value should be greater than the before conditions values*#*يجب ان تكون قيمة الشرط اكبر من قيمة الشروط التى تسبقه",
        400
        )
    );
    } else {
    approvals.push({
        level: maxLevel + 1,
        users: users,
        groups: groups,
        condition: condition,
    });
    await approval.save();
    }
}

res.status(201).json({
    message: "Add level done successfully*#*تمت أضافة المستوى بنجاح",
    data: approval,
});

});

exports.updateApproval = catchAsync(async (req, res, next) => {

apiHandler.update(Approval,req.body);

});

exports.updateApprovalLevel = catchAsync(async (req, res, next) => {

let groupFound ;
const {users ,groups ,Level ,condition} = req.body

const approval = await Approval.findById(req.params.approvalId).select("approvals");
const approvals = approval.approvals

const level = approval.approvals.find((e) => e.level == req.params.level);

const nLevel = parseInt(req.params.level) + 1;
const pLevel = parseInt(req.params.level) - 1;

const nextLevel = approval.approvals.find((e) => e.level === nLevel);
const preLevel = approval.approvals.find((e) => e.level === pLevel);

if (users) {
    level.users = users;
    await approval.save();
} else {
    level.users = [];
    await approval.save();
}

if (groups) {
    level.groups = groups;
    // send notification
    groups.forEach(async (group) => {
    groupFound = await Group.findOne({
        accountAdmin: req.user.id,
        id: group,
    });
    })
    await approval.save();
} else {
    level.groups = [];
    await approval.save();
}
if (approvals.length != 1) {
    // level 1
    if (Level == 1 && nextLevel) {
    if (condition >= 0 && condition < nextLevel.condition) {
        level.condition = condition;
        await approval.save();
    } else {
        return next(
        new AppError(
            "Condition value should be greater than the before conditions values*#*يجب ان تكون قيمة الشرط اكبر من قيمة الشروط التى تسبقه",
            400
        )
        );
    }
    }
    // middle level
    else if (
    Level > 1 &&
    Level < approvals[approvals.length - 1].level
    ) {
    if (
        condition > preLevel.condition &&
        condition < nextLevel.condition
    ) {
        level.condition = condition;
        await approval.save();
    } else {
        return next(
        new AppError(
            "Condition value should be greater than the before conditions values*#*يجب ان تكون قيمة الشرط اكبر من قيمة الشروط التى تسبقه",
            400
        )
        );
    }
    }
    // last level
    else if (
    approvals[approvals.length - 1].level == level.level
    ) {
    if (
        approvals[approvals.length - 2].condition <
        condition
    ) {
        level.condition = condition;
        await approval.save();
    } else {
        return next(
        new AppError(
            "Condition value should be greater than the before conditions values*#*يجب ان تكون قيمة الشرط اكبر من قيمة الشروط التى تسبقه",
            400
        )
        );
    }
    }
} else {
    level.condition = condition;
    await approval.save();
}

res.status(200).json({
    message: "Update level done successfully*#*تمت تعديل المستوى بنجاح",
    data: level,
});
});

//DELETE
exports.deleteApproval = catchAsync(async (req, res, next) => {

apiHandler.delete(Approval);

});

exports.deleteApprovalLevel = catchAsync(async (req, res, next) => {

const approval = await Approval.findOne({
    name: req.params.name,
    accountAdmin: req.user.id,
});

if(!approval || approval.approvals.length == 0) {
    return next(new AppError("There is nothing to delete *#* لا يوجد مستوى لمسحه"))
}

approval.approvals.pop();
await approval.save();

res.status(200).json({
    message: "Delete level done successfully*#*تمت مسح المستوى بنجاح",
});
});


// Handle approval operations in their documents

// prepare approvals
exports.approvalCycle = async (req, name) => {

const approvalList = await Approval.findOne({
    name: name,
    accountAdmin: req.user.accountAdmin,
}).select("approvals");


let totalPrice;
let array = [];
let index = 1;

totalPrice = req.body.header.find((e) => e.name === "total price").dataModel;

if (approvalList == undefined ||!approvalList || approvalList.approvals.length == 0) {
    array = [];
} else {
    let level0 = {
    level: approvalList.approvals[0].level,
    users: approvalList.approvals[0].users,
    groups: approvalList.approvals[0].groups,
    status: "inProcessing",
    };
    

    approvalList.approvals.forEach((e, i) => {
    if (e.condition == 0) {
        if (i == 0) {
        if (
            !approvalList.approvals[approvalList.approvals.length - 1].condition <= totalPrice &&
            !approvalList.approvals[approvalList.approvals.length - 1].condition != 0
        ) {
            array.push(level0);
        }
        } else {
        array.push({
            level: approvalList.approvals[i].level,
            users: approvalList.approvals[i].users,
            groups: approvalList.approvals[i].groups,
            status: "notTheLevel",
        });
        }
    }
    });


    // first level
    if (approvalList.approvals.length > 1) {
    if (totalPrice >= 0 && totalPrice < approvalList.approvals[1].condition) {
        array.push(level0);
    }

    // middle level
    if (
        approvalList.approvals.length > 2 &&
        !(totalPrice >= approvalList.approvals[approvalList.approvals.length - 1].condition) &&
        totalPrice >= approvalList.approvals[index].condition
    ) {
        while (
        totalPrice >= approvalList.approvals[index].condition &&
        !(totalPrice < approvalList.approvals[index + 1].condition)
        ) {
        index++;
        }
        for (let i = index; i != -1; i--) {
        if (i == 0) {
            array.push(level0);
        } else {
            array.push({
            level: approvalList.approvals[i].level,
            users: approvalList.approvals[i].users,
            groups: approvalList.approvals[i].groups,
            status: "notTheLevel",
            });
        }
        }
    }

    // last level
    if (
        approvalList.approvals[approvalList.approvals.length - 1].condition <= totalPrice &&
        approvalList.approvals[approvalList.approvals.length - 1].condition != 0
    ) {
        approvalList.approvals.forEach((e, i) => {
        if (i == 0) {
            array.push(level0);
        } else {
            array.push({
            level: approvalList.approvals[i].level,
            users: approvalList.approvals[i].users,
            groups: approvalList.approvals[i].groups,
            status: "notTheLevel",
            });
        }
        });
    }
    }
    
    return array;
}
};

// add approval accept
exports.addApprovalAccept = async (req, res, next, model) => {

const modelData = await mongoose
    .model(model)
    .findById(req.params.id)
    .select("approves header currentApprovalLevel accountAdmin");

const approvals = modelData.approves;

let UserLevel = [];
let group;

//push user level
approvals.forEach((e) => {
    e.users.forEach((d) => {
    if (d == req.user.id) {
        UserLevel.push(e.level);
    }
    });
});

//push group level
for(let a = 0 ; a < approvals.length ; a++) {
    for(let n = 0 ; n < approvals[a].groups.length ; n++) {
    group = await Group.findById(approvals[a].groups[n]).select("users")
    for(let i = 0 ; i < group.users.length ; i++) {
        if (group.users[i].id == req.user.id) {
        UserLevel.push(approvals[a].level);
        }
    }
    } 
}

let levels = UserLevel.filter(
    (item, index) => UserLevel.indexOf(item) === index
);

const currentLevel = approvals.find(
    (e) => e.level === modelData.currentApprovalLevel
);

const nextLevel = approvals.find((e) => e.level === currentLevel.level + 1);

if (levels.includes(modelData.currentApprovalLevel)) {
    if (approvals.length === modelData.currentApprovalLevel) {
    currentLevel.status = "accepted";
    currentLevel.approvedBy = req.user.id;
    modelData.status = "approved";
    let status = modelData.header.findIndex((e) => e.name === "status");
    modelData.header[status].dataModel = "approved";

    } else {
    currentLevel.status = "accepted";
    currentLevel.approvedBy = req.user.id;
    if (nextLevel !== (undefined || null)) {
        nextLevel.status = "inProcessing";
    }
    modelData.currentApprovalLevel = modelData.currentApprovalLevel + 1;
    }

    await mongoose.model(model).findByIdAndUpdate(
    req.params.id,
    {
        header: modelData.header,
        approves: modelData.approves,
        status: modelData.status,
        currentApprovalLevel : modelData.currentApprovalLevel
    },
    { new: true, runValidators: true }
    );
} else {
    return next(
    new AppError(
        "You don't have permission to make approve*#*لا تمتلك الصلاحية للقيام بالمواافقة",
        400
    )
    );
}

res.status(200).json({
    message: "Your approved done successfully*#*تم تسجيل موافقتك بنجاح",
    data: modelData,
});

};

// add approval reject
exports.addApprovalReject = async (req, res, next, model) => {

const modelData = await mongoose
    .model(model)
    .findById(req.params.id)
    .select("approves header currentApprovalLevel");
const approvals = modelData.approves;

let UserLevel = [];
let group;

//push user level
approvals.forEach((e) => {
    e.users.forEach((d) => {
    if (d == req.user.id) {
        UserLevel.push(e.level);
    }
    });
});

//push group level
for(let a = 0 ; a < approvals.length ; a++) {
    for(let n = 0 ; n < approvals[a].groups.length ; n++) {
    group = await Group.findById(approvals[a].groups[n]).select("users")
    for(let i = 0 ; i < group.users.length ; i++) {
        if (group.users[i].id == req.user.id) {
        UserLevel.push(approvals[a].level);
        }
    }
    } 
}

let levels = UserLevel.filter(
    (item, index) => UserLevel.indexOf(item) === index
);

const currentLevel = approvals.find(
    (e) => e.level === modelData.currentApprovalLevel
);
if (levels.includes(modelData.currentApprovalLevel)) {
    currentLevel.status = "declined";
    currentLevel.approvedBy = req.user.id;
    modelData.status = "rejected";
    let status = modelData.header.findIndex((e) => e.name === "status");
    modelData.header[status].dataModel = "rejected";

    await modelData.save();
    await mongoose
    .model(model)
    .findByIdAndUpdate(req.params.id,
        { header: modelData.header },
        { new: true, runValidators: true }
    );
} else {
    return next(
    new AppError(
        "You don't have permission to make approve*#*لا تمتلك الصلاحية للقيام بالمواافقة",
        400
    )
    );
}

res.status(200).json({
    message: "Your reject done successfully*#*تم تسجيل رفضك بنجاح",
    data: modelData,
});

};


module.exports = Approval;
