// Features
const catchAsync = require("./catchAsync")
const AppError = require("./appError")
const APIfeatures = require("./apiFeatures")

// Functions
const Function = require("./functions")

// Variables
const functions = new Function()


class API {

getAll = (Model,query,search,selectOptions,popOptions) => {
    return catchAsync(async (req , res , next) => {

    let docQuery = Model.find(query).lean();

    if(search) {
        const searchKey = search.key;
        const searchValue = search.value.trim();

        docQuery = docQuery.find({[searchKey] : {$regex : new RegExp('^'+searchValue+'.*','i')}})
    } 
    if(selectOptions) docQuery = docQuery.select(selectOptions)
    if(popOptions) docQuery = docQuery.populate(popOptions);


    const features = new APIfeatures(docQuery, req.query)
    .filter()
    .sort()
    .pagination();

    const docs = await features.query.lean();

    if(!docs || docs.length == 0) {
        return next(new AppError("There is no data *#* لا يوجد بيانات",404))
    }
        
    // Count documents using the aggregation pipeline
    const countPipeline = [
    { $match: query },
    { $group: { _id: null, count: { $sum: 1 } } },
    ];
    const [{ count }] = await Model.aggregate(countPipeline);
    
    // Calculate pages count
    const pages = functions.pagesCount(count);

    await functions.checkPage(req,next,pages);

    res.status(200).json({ 
    status : "success",
    result: count,
    pages : pages,
    data: docs,
    });

})
}

getOne = (Model , filter, selectOptions , popOptions) => {
    return catchAsync(async (req , res , next) => {

        let query = Model.findOne(filter)

        if(selectOptions) query = query.select(selectOptions)
        if(popOptions) query = query.populate(popOptions);

        const doc = await query;

        if(!doc) {
            return next(new AppError("There is no data*#* لا يوجد بيانات" , 404))
        }

        res.status(200).json({
            status : "success",
            data : doc,
        })
    })
}

create = (Model,data) => {
    return catchAsync(async (req , res , next) => {
        const doc = await Model.create(data);

        res.status(201).json({
            status : "success",
            message : "Data added successfully *#* تم اضافة البيانات بنجاح",
            data : doc,
        })
    })
}

update = (Model , data) => {
    return catchAsync(async (req , res , next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id,data, {
            new : true,
            runValidators : true
        });

        if(!doc) {
            return next(new AppError("There is no data to update it*#* لا يوجد بيانات لتعديلها" , 404))
        }
        res.status(200).json({
            status : "success",
            message : "Data updated successfully *#* تم تعديل البيانات بنجاح",
            data : doc,
        })
    })
}

delete = (Model) => {
    return catchAsync(async (req , res , next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);

        if(!doc) {
            return next(new AppError("There is no data to delete it*#* لا يوجد بيانات لمسحها" , 404))
        }
        res.status(204).json({
            status : "success",
            message : "Delete data done successfully *#*تم مسح البيانات بنجاح",
        })
    })
}

deleteMany = (Model) => {
    return catchAsync(async (req , res , next) => {
        await Model.deleteMany({});

        res.status(204).json({
            status : "success",
            message : "Delete data done successfully *#*تم مسح البيانات بنجاح",
        })
    })
}

}

module.exports = API ;