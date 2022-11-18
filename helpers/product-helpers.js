const { response } = require('express')
const { ObjectId } = require('mongodb')
const { resolve } = require('promise')
const collections = require('../config/collections')
let db=require('../config/connection')
let objId=require('mongodb').ObjectId

module.exports={

//add product to mongodb
  addProduct(productData,urls,callback){
     productData.actualPrice=parseInt(productData.actualPrice)
     productData.offerPrice=parseInt(productData.actualPrice)
     productData.stock=parseInt(productData.stock)
     productData.productOffer=0
     productData.categoryOffer=0
     productData.image=urls
    db.get().collection(collections.PRODUCT_COLLECTION).insertOne(productData).then((data)=>{
    callback(data.insertedId.toString())
    })
    },

//admin view all-products
  getAllProducts(){
    return new Promise(async(resolve,reject)=> {
        let product = await db.get().collection(collections.PRODUCT_COLLECTION).find({}).toArray();
        console.log(product)
        resolve(product)
    })
  },
//shop page
getShop(categoryName){
  return new Promise(async(resolve, reject) => {
  let product = await db.get().collection(collections.PRODUCT_COLLECTION).find({category:categoryName}).toArray()
    resolve(product)
  })
},
//admin delete product
  deleteProduct: (productId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.PRODUCT_COLLECTION).deleteOne({_id:objId(productId)}).then((response)=>{
        resolve(response)
      })

    })
  },
//product details page
  viewDetails:(productId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.PRODUCT_COLLECTION).find({_id:ObjectId(productId)}).toArray().then((response)=>{
        resolve(response)
      })
      
    })
  },
//edit product
editProduct:(productId,updatedData)=>{
 return new Promise((resolve,reject)=>{
  db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(productId)},{ "$set" :updatedData}).then(()=>{
    resolve()
  })
 })  
},

//add Product offer
addProductOffer:(offerDetails)=>{
  return new Promise(async(resolve, reject) => {
    let proId=ObjectId(offerDetails.product)
    offerPercentage=Number(offerDetails.percentage)
    await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:proId},{$set:{productOffer:offerPercentage}})
    let product= await db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:proId})
    if(product?.productOffer>=product?.categoryOffer){
      let temp=(product.actualPrice*product.productOffer)/100
      let updatedOfferPrice=(product.actualPrice-temp)
      let updatedProduct=await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:proId},{$set:{offerPrice:updatedOfferPrice}})
      resolve(updatedProduct)
    }

    
  })
},
//show products with product offer
getProductOffer:()=>{
  return new Promise(async(resolve, reject) => {
    offerProducts=await db.get().collection(collections.PRODUCT_COLLECTION).aggregate(
      [{
        $match: {
         productOffer: {
          $gt: 0
         }
        }
       }, {
        $project: {
         name: 1,
         productOffer: 1
        }
       }]
    ).toArray()
    resolve(offerProducts)
  })

},
//delete product offer
deleteProdOffer:(prodId)=>{
  return new Promise(async(resolve, reject) => {
    db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(prodId)},{$set:{productOffer:0}})
    .then((response)=>{
      db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:ObjectId(prodId)}).then((response)=>{
        if(response.productOffer==0&&response.categoryOffer==0){
          response.offerPrice=response.actualPrice
          db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(prodId)},{$set:{offerPrice:response.offerPrice}})

        }else if(response.categoryOffer>response.productOffer){
          let offerCalc=(response.categoryOffer*response.actualPrice)/100
          let updatedOfferPrice=(response.actualPrice-offerCalc)
          db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(prodId)},{$set:{offerPrice:updatedOfferPrice}})
        }
      })

      resolve()
    })
  })
  
},

//add category offer
addCategoryOffer:(details)=>{
  let category=details.category
  let percentage=Number(details.percentage)
  return new Promise(async(resolve,reject) => {
    db.get().collection(collections.CATEGORIES_COLLECTION).updateOne({category:category},{$set:{categoryOffer:percentage}})
    await db.get().collection(collections.PRODUCT_COLLECTION).updateMany({category:category},{$set:{categoryOffer:percentage}})
    let products =await db.get().collection(collections.PRODUCT_COLLECTION).find({category:category}).toArray()
    for(let i = 0; i < products.length; i++){
      if(products[i].categoryOffer>products[i].productOffer){
        let temp=(products[i].actualPrice*products[i].categoryOffer)/100
        let updatedOfferPrice=(products[i].actualPrice-temp)    
        db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(products[i]._id)},{$set:{offerPrice:updatedOfferPrice}})
      }
      
    }
     resolve()
  })
  
},


//display categories with offer
getCategoryOffer:()=>{
  return new Promise(async(resolve, reject) => {
  let categoryOffer=await db.get().collection(collections.CATEGORIES_COLLECTION).find({categoryOffer:{$gt:0}}).toArray()
  resolve(categoryOffer)
  })
  
},

//delete category offer
deleteCatOffer:(categoryName)=>{
  return new Promise(async(resolve, reject) => {
    db.get().collection(collections.CATEGORIES_COLLECTION).updateOne({category:categoryName},{$set:{categoryOffer:0}})
    db.get().collection(collections.PRODUCT_COLLECTION).updateMany({category:categoryName},{$set:{categoryOffer:0}}).then(async()=>{
      let allProducts=await db.get().collection(collections.PRODUCT_COLLECTION).find({category:categoryName}).toArray()
      for (let i = 0; i < allProducts.length; i++) {
        if(allProducts[i].categoryOffer===0 && allProducts[i].productOffer===0){
          allProducts[i].offerPrice=allProducts[i].actualPrice
          db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(allProducts[i]._id)},{$set:{offerPrice:allProducts[i].offerPrice}})
        }else if(allProducts[i].categoryOffer<allProducts[i].productOffer){
          let offerCalc=(allProducts[i].productOffer*allProducts[i].actualPrice)/100
          let updatedOfferPrice=(allProducts[i].actualPrice-offerCalc)
          db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(allProducts[i]._id)},{$set:{offerPrice:updatedOfferPrice}})
        }       
      }
    })
    resolve()
  })
},

//add coupon
addCoupon:(details)=>{
return new Promise(async(resolve, reject) => {
  let couponCheck=await db.get().collection(collections.COUPON_COLLECTION).findOne({coupon:details.coupon})
  if(couponCheck===null){
    details.percentage=Number(details.percentage)
    details.minimumPrice=Number(details.minimumPrice)
    details.isoDate=new Date(details.expirydate)
    details.users=[]
    db.get().collection(collections.COUPON_COLLECTION).insertOne(details)
    resolve()
  }else{
    reject()
  }
})
},
//get all coupon
getCoupon:()=>{
  return new Promise(async(resolve, reject) => {
    let coupons=await db.get().collection(collections.COUPON_COLLECTION).find({}).toArray()
    resolve(coupons)
  })
},
//delete coupon
deleteCoupon:(couponId)=>{
return new Promise((resolve, reject) => {
  db.get().collection(collections.COUPON_COLLECTION).deleteOne({_id:ObjectId(couponId)}).then((response)=>{
    resolve(response)
  })
})
},
//redeem coupon
redeemCoupon:(couponCode,userId)=>{
return new Promise(async(resolve, reject) => {
let user= await db.get().collection(collections.COUPON_COLLECTION).findOne({$and:[{coupon:couponCode},{users:ObjectId(userId)}]})
 db.get().collection(collections.COUPON_COLLECTION).findOne({$and:[{coupon:couponCode},{isoDate:{$gte:new Date()}}]}).then((response)=>{
  if(response!==null&&!user){
    resolve(response)
  }else{
    reject()
  }
 
 })
})
},
//search bar
getSearchBar:(key)=> {
  return new Promise(async(resolve, reject) => {
    let data=await db.get().collection(collections.PRODUCT_COLLECTION).find({

      "$or":[
        {name: {$regex: key, '$options':'i'}},
        {brand:{$regex: key, '$options':'i'}},
        {category:{$regex: key, '$options':'i'}}
      ]
    }).toArray()
    if(data.length !=null) {
      resolve(data)
    }else {
      reject()
    }
  })
},

}















