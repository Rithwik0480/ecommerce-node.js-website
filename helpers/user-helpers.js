let db = require("../config/connection");
let collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const collections = require("../config/collections");
let objId = require("mongodb").ObjectId;
const Razorpay = require("razorpay");
const paypal = require("../utils/paypal")
const { response } = require("express");
const razorpay=require("../utils/razorpay");
const { resolve } = require("path");
//razorpay instance
const instance = new Razorpay({
  key_id: razorpay.key_id,
  key_secret: razorpay.key_secret,
});
// const instance = new Razorpay({
//   key_id: "rzp_test_VwYmn71lxuv9wv",
//   key_secret: "644Cg6DPRj8FO2tWHVu4zMKq",
// });
module.exports = {
  // signup data
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      userData.address = [];
      userData.referralId =
        userData.firstName + new ObjectId().toString().slice(1, 7);
      userData.status = true;
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          db.get().collection(collections.WALLET_COLLECTION).insertOne({
            userId: userData._id,
            walletBalance: 0,
            referralId: userData.referralId,
            transaction: [],
          });
          resolve(userData);
        });

      if (userData.referralCode) {
        db.get()
          .collection(collections.USER_COLLECTION)
          .findOne({ referralId: userData.referralCode })
          .then(async (response) => {
            if (response) {
              let referralAmount = 100;
              await db
                .get()
                .collection(collections.WALLET_COLLECTION)
                .updateOne(
                  { userId: ObjectId(userData._id) },
                  { $set: { walletBalance: 100 } }
                );
              await db
                .get()
                .collection(collections.WALLET_COLLECTION)
                .updateOne(
                  { referralId: userData.referralCode },
                  { $inc: { walletBalance: 100 } }
                );
            }
          });
      }
    });
  },

  //user login
  doLogin: (loginData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};

      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ emailAddress: loginData.email });

      if (user && user.status) {
        bcrypt.compare(loginData.password, user.password).then((status) => {
          if (status) {
            console.log("login sucessfull");
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("wrong password");
            resolve({ status: false });
          }
        });
      } else {
        console.log("user not found");
        resolve({ status: false });
      }
    });
  },
//verify otp number
verifyNumber:(number)=>{
return new Promise((resolve, reject) => {
  db.get().collection(collections.USER_COLLECTION).findOne({phoneNumber:"+91"+number}).then((response)=>{
    if(response!=null){
      resolve(response)
    }else{
      reject(response)
    }

  })
})
},
  //add to cart
  addToCart: (prodId, userId) => {
    let prodObj = {
      item: ObjectId(prodId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objId(userId) })
        
      if (userCart) {
        let prodExist = userCart.product.findIndex(
          (product) => product.item == prodId
        );

        if (prodExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objId(userId), "product.item": objId(prodId) },
              {
                $inc: { "product.$.quantity": 1 },
              }
            )
            .then(() => {
              // resolve()
              reject()
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objId(userId) },
              {
                $push: { product: prodObj },
              }
            )
            .then((response) => {
              resolve();

            });
        }
      } else {
        let cartObj = {
          user: objId(userId),
          product: [prodObj],
        };

        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((prdctInsert) => {
            resolve();
          });
      }
    });
  },

  //products in cart
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: new ObjectId(userId),
            },
          },
          {
            $unwind: {
              path: "$product",
            },
          },
          {
            $project: {
              item: "$product.item",
              quantity: "$product.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "cartItems",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: {
                $arrayElemAt: ["$cartItems", 0],
              },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },

  //number of items in cart
  cartCount: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objId(userId) })
        .then((cart) => {
          if (cart) resolve(cart.product.length)
        });
    });
  },

  //inc&decrement quantity button in cart
  changeProdQuantity: (prodDetails) => {
    let count = parseInt(prodDetails.count);
    let quantity = parseInt(prodDetails.quantity);
    return new Promise((resolve, reject) => {
      if (count == -1 && quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objId(prodDetails.cart) },
            {
              $pull: { product: { item: objId(prodDetails.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objId(prodDetails.cart),
              "product.item": objId(prodDetails.product),
            },
            {
              $inc: { "product.$.quantity": count },
            }
          )
          .then((response) => {
            resolve({status:true});
          });
      }
    });
  },

  //delete product from cart
  removeProd: (prodId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { user: objId(userId) },
          {
            $pull: { product: { item: objId(prodId) } },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  //total price of cart items
  totalPrice: (userId) => {
    return new Promise(async (resolve, reject) => {
      let totalPrice = await db
        .get()
        .collection(collection.CART_COLLECTION)

        .aggregate([
          {
            $match: { user: objId(userId) },
          },
          {
            $unwind: "$product",
          },
          {
            $project: {
              item: "$product.item",
              quantity: "$product.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: {
                $arrayElemAt: ["$product", 0],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $multiply: ["$quantity", "$product.offerPrice"] },
              },
            },
          },
        ])
        .toArray();

      resolve(totalPrice[0]);
    });
  },
  //user adress from user collection
  getUserAddress: (orderData) => {
    return new Promise(async (resolve, reject) => {
      let userAddress = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: ObjectId(orderData.userId),
            },
          },
          {
            $unwind: {
              path: "$address",
            },
          },
          {
            $match: {
              "address._id": ObjectId(orderData.addressId),
            },
          },
          {
            $project: {
              firstName: "$address.firstName",
              lastName: "$address.lastName",
              address: "$address.address",
              zipCode: "$address.zipcode",
              city: "$address.city",
              state: "$address.state",
              country: "$address.country",
              phoneNumber: "$phoneNumber",
              _id: "$address._id",
            },
          },
        ])
        .toArray();
      resolve(userAddress);
    });
  },

  //Placing Order
  placeOrder: (orderData, products, addressDetails, total, couponName) => {
    console.log(products);
    return new Promise((resolve, reject) => {
      let status = orderData["paymentMethod"] === "COD" ? "placed" : "pending";
      products.forEach((element) => {
        element.status = status;
      });
      let orderObj = {
        userId: objId(orderData.userId),
        totalPrice: total,
        paymentMethod: orderData["paymentMethod"],

        products: products,

        quantity: products[0].quantity,
        deliveryDetails: {
          name: addressDetails[0].firstName,
          address: addressDetails[0].address,
          city: addressDetails[0].city,
          state: addressDetails[0].state,
          zipCode: addressDetails[0].zipCode,
          phoneNumber: addressDetails[0].phoneNumber,
        },
        // status: status,
        displayDate: new Date().toDateString(),
        date: new Date(),
      };

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          if (status === "placed") {
            db.get()
              .collection(collection.CART_COLLECTION)
              .deleteOne({ user: ObjectId(orderData.userId) });

            products.forEach((item) => {
              db.get()
                .collection(collections.PRODUCT_COLLECTION)
                .updateOne(
                  { _id: ObjectId(item.productId) },
                  { $inc: { stock: -item.quantity } }
                );
            });
            resolve(response.insertedId);
          } else {
            resolve(response.insertedId);
          }
        });

      if (couponName) {
        db.get()
          .collection(collections.COUPON_COLLECTION)
          .updateOne(
            { coupon: couponName },
            { $push: { users: ObjectId(orderData.userId) } }
          );
      }
    });
  },
  //decrement wallet amount
  decrmntWallet: (userId, amount) => {
    db.get()
      .collection(collections.WALLET_COLLECTION)
      .findOne({ userId: ObjectId(userId) })
      .then((response) => {
        let updatedBal = response.walletBalance - amount;
        db.get()
          .collection(collections.WALLET_COLLECTION)
          .updateOne(
            { userId: ObjectId(userId) },
            { $set: { walletBalance: updatedBal } }
          );
      });
  },

  //get cart product list
  getCartProdList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: ObjectId(userId),
            },
          },
          {
            $unwind: {
              path: "$product",
            },
          },
          {
            $project: {
              userId: "$user",
              product: "$product.item",
              quantity: "$product.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "product",
              foreignField: "_id",
              as: "productInfo",
            },
          },
          {
            $project: {
              quantity: 1,

              productInfo: {
                $arrayElemAt: ["$productInfo", 0],
              },

              productId: { $arrayElemAt: ["$productInfo._id", 0] },
            },
          },
        ])
        .toArray();

      resolve(cart);
    });
  },

  //order list
  deletePending: () => {
    db.get()
      .collection(collections.ORDER_COLLECTION)
      .deleteMany({ "products.status": "pending" });
  },

  getOrderList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              userId: ObjectId(userId),
            },
          },
          {
            $unwind: {
              path: "$products",
            },
          },
          {
            $project: {
              totalPrice: 1,
              userId: 1,
              paymentMethod: 1,
              displayDate: 1,
              date: 1,
              status: 1,
              deliveryDetails: 1,
              proStatus: "$products.status",
              quantity: "$products.quantity",
              productInfo: "$products.productInfo",
            },
          },
        ])
        .toArray();
      resolve(orders);
    });
  },

  //cancel order
  cancelOrder: (orderId, prodId) => {
    return new Promise((resolve, reject) => {
      let dateStatus = new Date();
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objId(orderId), "products.productId": ObjectId(prodId) },
          {
            $set: {
              "products.$.status": "cancelled",
              statusUpdateDate: dateStatus,
            },
          }
        )
        .then((response) => {
          resolve()
        })
    })
  },
  //return order
  returnOrder:(orderId, prodId)=> {
    return new Promise((resolve, reject) => {
      let dateStatus = new Date();
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .updateOne(
          { _id: objId(orderId), "products.productId": ObjectId(prodId) },
          {
            $set: {
              "products.$.status": "return",
              statusUpdateDate: dateStatus,
            },
          }
        )
        .then((response) => {
          resolve()
        })
    })
  },


  //adress book data
  addressBook: (addressData, userId) => {
    return new Promise((resolve, reject) => {
      addressData._id = new ObjectId();
      db.get()
        .collection(collections.USER_COLLECTION)
        .updateOne(
          { _id: objId(userId) },
          {
            $push: { address: addressData },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  //wallet details
  userWallet: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.WALLET_COLLECTION)
        .findOne({ userId: ObjectId(userId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
//coupon details
getCoupons:()=>{
return new Promise(async(resolve, reject) => {
  let couponInfo = await db.get().collection(collections.COUPON_COLLECTION).find({}).toArray()
  resolve(couponInfo)
})
},
  getAddressList: (userId,addressId) => {
    return new Promise(async (resolve, reject) => {
      let addressData = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: ObjectId(userId),
            },
          },
          {
            $unwind: {
              path: "$address",
            },
          },
          {
            $project: {
              address: 1,
            },
          },
        ])
        .toArray();
      resolve(addressData);
    });
  },

  //razorpay
  generateRazorpay: (orderId, totalPrice) => {
    orderId = ObjectId(orderId);
    let Id = orderId.toString();
    return new Promise((resolve, reject) => {
      var options = {
        amount: totalPrice * 100,
        currency: "INR",
        receipt: Id,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          resolve(order);
        }
      });
    });
  },
  //razorpay verification
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "644Cg6DPRj8FO2tWHVu4zMKq");

      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId, userId, products) => {
    return new Promise((resolve, reject) => {
      products.forEach(async (item) => {
        let response = await db
          .get()
          .collection(collections.ORDER_COLLECTION)
          .updateOne(
            {
              _id: ObjectId(orderId),
              "products.productId": ObjectId(item.productId),
            },
            {
              $set: {
                "products.$.status": "placed",
              },
            }
          );

        
        await db
          .get()
          .collection(collections.PRODUCT_COLLECTION)
          .updateOne(
            { _id: ObjectId(item.productId) },
            { $inc: { stock: -item.quantity } }
          );
      });

      db.get()
        .collection(collection.CART_COLLECTION)
        .deleteOne({ user: ObjectId(userId) });

      resolve();
    });
  },

//get edit address
getEditAddress:(userId,addressId)=> {
  return new Promise(async (resolve, reject) => {
    let addressData = await db
      .get()
      .collection(collections.USER_COLLECTION)
      .aggregate(
        [{
          $match: {
           _id: ObjectId(userId)
          }
         }, {
          $unwind: {
           path: '$address'
          }
         }, {
          $match: {
           'address._id': ObjectId(addressId)
          }
         }, {
          $project: {
           address: 1
          }
         }]
      )
      .toArray();
    resolve(addressData);
  });
},
//post edited address
updateAddress:(userId,addressId,addressDetails)=> {
  var address = {

    firstname: addressDetails.firstName,
    lastname: addressDetails.lastName,
    address: addressDetails.address,
    zipcode: addressDetails.zipcode,
    city: addressDetails.city,
    state: addressDetails.state,
    country: addressDetails.country,
    phoneNumber: addressDetails.phoneNumber,
   

}
  


  return new Promise(async(resolve,reject)=> {
    console.log({address},{addressId},{userId})
    await db.get().collection(collections.USER_COLLECTION).updateOne(
      {
        _id:ObjectId(userId),
        'address._id':ObjectId(addressId),
      },
      {
       $set:{
       "address.$.firstName":address.firstname,
       "address.$.lastName":address.lastname,
       "address.$.address":address.address,
       "address.$.zipcode":address.zipcode,
       "address.$.city":address.city,
       "address.$.state":address.state,
       "address.$.country":address.country,
       "address.$.phoneNumber":address.phoneNumber,
      
      }
    }).then((response)=>{
      console.log({response})
     
    })
    resolve()
  })
}

}
