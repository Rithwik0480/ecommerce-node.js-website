const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { resolve, reject } = require("promise");
const collections = require("../config/collections");
const db = require("../config/connection");
let objId = require("mongodb").ObjectId;
module.exports = {
  doLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let admin = await db
        .get()
        .collection(collections.ADMIN_COLLECTION)
        .findOne({ emailAddress: adminData.email });
      if (admin) {
        await bcrypt
          .compare(adminData.password, admin.password)
          .then((status) => {
            if (status) {
              console.log("true");
              response.admin = admin;
              response.status = true;
              resolve(response);
            } else {
              console.log("false");
              resolve({ status: false });
            }
          });
      } else {
        console.log("no such user");
        resolve({ status: false });
      }
    });
  },

  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .find({})
        .toArray()
        .then((users) => {
          resolve(users);
        });
    });
  },

  updateStatus: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ _id: objId(userId) }, [
          { $set: { status: { $not: "$status" } } },
        ]);
      resolve("statusUpdated");
    });
  },

  // Category management

  getCategories: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collections.CATEGORIES_COLLECTION)
        .find({})
        .toArray();
      resolve(categories);
    });
  },

  setCategory: (category) => {
    return new Promise((resolve, reject) => {
      category.categoryOffer=0
      db.get()
        .collection(collections.CATEGORIES_COLLECTION)
        .insertOne(category)
        .then((response) => {
          resolve(response);
        });
    });
  },

  deleteCategory: (categoryId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CATEGORIES_COLLECTION)
        .deleteOne({ _id: objId(categoryId) })
        .then((status) => {
          resolve(status);
        });
    });
  },
  //order management
  // getOrderlist:()=>{
  //     return new Promise(async(resolve,reject)=>{
  //        let userOrders= await db.get().collection(collections.ORDER_COLLECTION).find({}).toArray()
  //             resolve(userOrders)
  //             console.log(userOrders)

  //     })
  // },
  getOrderlist: () => {
    return new Promise(async (resolve, reject) => {
      let userOrders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {},
          },
          {
            $unwind: {
              path: "$products",
            },
          },
          {
            $project: {
              userId: 1,
              totalPrice: "$totalPrice.total",
              paymentMethod: 1,
              products: "$products.productInfo",
              proStatus:"$products.status",
              quantity: "$products.quantity",
              deliveryDetails: 1,
              status: 1,
              displayDate: 1,
              date: 1,
            },
          },
        ])
        .toArray();
      resolve(userOrders);
      console.log(userOrders);
    });
  },

  updateProdStatus: (data) => {
    return new Promise((resolve, reject) => {
      let dateStatus = new Date();
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne({ _id: objId(data.orderId),'products.productId':ObjectId(data.prodId)}, 
          { $set: { "products.$.status": data.status, statusUpdateDate: dateStatus } },
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  //banner management
  addBanner:(bannerData,image_url)=> {
    return new Promise((resolve,reject)=>{
      bannerData.image=image_url
      db.get().collection(collections.BANNER_COLLECTION).insertOne(bannerData).then((response)=> {
        resolve(response)
      })
    })

  },
  dispalyBanner:()=> {
    return new Promise(async(resolve,reject)=>{
      bannerData=await db.get().collection(collections.BANNER_COLLECTION).find({}).toArray()
      resolve(bannerData)
    })
  },

  //sales report-delivered order list
  deliveredOrderList: (yy, mm) => {
    return new Promise(async (resolve, reject) => {
      // let agg = [
      //   {
      //     $match: {
      //       status: "delivered",
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path: "$products",
      //     },
      //   },
      //   {
      //     $project: {
      //       totalPrice: "$totalPrice",
      //       paymentMethod: 1,
      //       statusUpdateDate: 1,
      //       status: 1,
      //     },
      //   },
      // ];
      let agg = 
        [
          {
            '$match': {
              'products.status': 'delivered'
            }
          }, {
            '$unwind': {
              'path': '$products'
            }
          }, {
            '$project': {
              'totalPrice': '$totalPrice', 
              'paymentMethod': 1, 
              'statusUpdateDate': 1, 
              'status': '$products.status', 
              'offerPrice': '$products.productInfo.offerPrice'
            }
          }
        ]

      if (mm) {
        let start = "1";
        let end = "30";
        let fromDate = mm.concat("/" + start + "/" + yy);
        let fromD = new Date(new Date(fromDate).getTime() + 3600 * 24 * 1000);

        let endDate = mm.concat("/" + end + "/" + yy);
        let endD = new Date(new Date(endDate).getTime() + 3600 * 24 * 1000);

        dbQuery = {
          $match: {
            statusUpdateDate: {
              $gte: fromD,
              $lte: endD,
            },
          },
        };

        agg.unshift(dbQuery)
        let deliveredOrders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate(agg)
          .toArray();
        resolve(deliveredOrders);
      } else if (yy) {
        
        let dateRange = yy.daterange.split("-");
        let [from, to] = dateRange;
        from = from.trim("");
        to = to.trim("");
        fromDate = new Date(new Date(from).getTime() + 3600 * 24 * 1000);
        toDate = new Date(new Date(to).getTime() + 3600 * 24 * 1000);

        dbQuery = {
          $match: {
            statusUpdateDate: {
              $gte: fromDate,
              $lte: toDate,
            },
          },
        };

        agg.unshift(dbQuery);
        let deliveredOrders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate(agg)
          .toArray();
        resolve(deliveredOrders);
      } else {
        let deliveredOrders = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .aggregate(agg)
          .toArray();
        resolve(deliveredOrders);
      }
    });
  },
  //total revenue
  getTotalRevenue:(orderDetails)=> {
    return new Promise((resolve,reject)=>{

      const total=orderDetails.reduce((acc,item)=>acc+item.totalPrice,0)
      resolve(total)
    })

  },

  //bargraph values
  barGraph:()=>{
    return new Promise(async(resolve,reject)=>{
        let value={}
        value.deliveredCount= await db.get().collection(collections.ORDER_COLLECTION).find({'products.status':"delivered"}).count()
        value.cancelledCount= await db.get().collection(collections.ORDER_COLLECTION).find({'products.status':"cancelled"}).count()
        value.shippedCount= await db.get().collection(collections.ORDER_COLLECTION).find({'products.status':"shipped"}).count()
        value.pendingCount= await db.get().collection(collections.ORDER_COLLECTION).find({'products.status':"pending"}).count()
        value.placedCount= await db.get().collection(collections.ORDER_COLLECTION).find({'products.status':"placed"}).count()
        resolve(value)
    })

  }

}
