var express = require("express")
var router = express.Router()
const MongoClient = require("mongodb").MongoClient
const auth = require("../utils/auth")
const client = require("twilio")(auth.accountsId, auth.authToken)
const userHelpers = require("../helpers/user-helpers")
const productHelpers=require("../helpers/product-helpers")
const session = require("express-session")
const { response } = require("express")
const { resolve } = require("promise")
const paypal = require('../utils/paypal')
const { totalPrice } = require("../helpers/user-helpers")
const { Db } = require("mongodb")

const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
  next()
  }else{
    res.redirect("/user/login")
  }
}
const verifyCart=(req,res,next)=>{
  if(req.session.loggedIn){
  next()
  }else{
    res.json({status:false})
  }
}

//signup page display
router.get("/signup", (req, res, next) => {
  res.render("user/userSignup",{adminPage:true});
});

//signup page data
router.post("/signup", (req, res, next) => {
  userHelpers.doSignup(req.body).then((response) => {
    req.session.loggedIn=true
    req.session.user=response
    res.redirect("/user/login")
  })
})

//user login page
router.get("/login", (req, res, next) => {
  if (req.session.loggedIn) {
    res.redirect("/");   
  } else {
    res.render("user/userLogin", { loginErr: req.session.loginErr,adminPage:true});
    req.session.loginErr = false;
  }
});     
//verify otp mobile number
router.post("/verifyNumber",(req,res)=>{
  userHelpers.verifyNumber(req.body.phoneNumber).then((response)=>{
    req.session.user = response
    //inserting phone number to twilio
        client.verify
        .services(auth.serviceId)
        .verifications.create({
          to: `${response.phoneNumber}`,
          channel: "sms",
        })
        .then(() => {
          console.log("OTP RECEIEVED")
        })
        .catch((err) => {
          console.log(err)
        })
    ////////////////////////////////////////
    res.json(response)
  }).catch((response)=>{
    res.json({msg:"Invalid Phone Number"})
  })
})
//otp login
router.post("/otpVerification",(req,res)=>{
otp=req.body.otp.join('')
//verifying otp by twilio
  client.verify
    .services(auth.serviceId)
    .verificationChecks.create({
      to: `${req.body.phoneNumber}`,
      code: otp,
    })
    .then((data) => {
      if (data.status == "approved"  ) {
        console.log("SUUUUUUUUUCEEESSSSSSSS");
        req.session.loggedIn = true
        // res.redirect("/")
        res.json({status:true})
      } else {
        console.log("wrongoooooootp");
        req.session.loggedIn = false
        req.session.user = null
        res.json({status:false})
        res.redirect("/user/login")
      }
    })
    .catch((err) => {
      console.log("ERRRRRRRRRRRRRRRRRRRRRRR");
      console.log(err)
      res.json({status:false})
    })
/////////////////////////////////////////////

})
//user login & otp auth
router.post("/login", (req, res) => {
  userHelpers   
    .doLogin(req.body)
    .then((response) => {

    if(response.status){
      req.session.loggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      req.session.loginErr=true
      res.redirect('/user/login')
    }
  })
})

//logout user
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
})

//search bar
router.get("/search",verifyLogin,(req,res)=> {
  productHelpers.getSearchBar(req.query.search).then((searchProduct)=>{
    res.render("user/shop",{searchProduct,user:req.session.user})
  })
})

//single product details page
router.get("/productDetails/:id",(req,res)=>{
  productId=req.params.id
  let cartNumber=null
  let userId=req.session.user
  if(userId)
  {
  userHelpers.cartCount(userId._id).then((count)=>{
  cartNumber=count
  })
  }
  productHelpers.viewDetails(productId).then((productDetails)=>{
  res.render("user/product-details",{productDetails,cartNumber,user:req.session.user})
  })

})
//shop page
// router.get("/shop",verifyLogin,(req,res)=>{
//   productHelpers.getAllProducts().then((product)=>{
//     res.render("user/shop",{product,user:req.session.user})
//   })
// })
router.get("/shop/:id",verifyLogin,(req,res)=>{
  let categoryName=req.params.id
  productHelpers.getShop(categoryName).then((product)=> {
    console.log(product,"FFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
    res.render("user/shop",{product,categoryName,user:req.session.user})
  })
})
//cart
router.get("/cart",verifyLogin,(req,res)=>{
  let cartNumber=null
  let userId= req.session.user._id
  userHelpers.cartCount(userId).then((count)=>{
    cartNumber=count
  })
  userHelpers.totalPrice(userId).then((totalPrice)=>{
    userHelpers.getCartProducts(userId).then((products)=>{
      res.render('user/cart-page',{user:userId,products,cartNumber,totalPrice})
  
    })
  })
})

//add to cart
router.get("/addToCart/:id",verifyCart,(req,res)=>{
  userHelpers.addToCart(req.params.id,req.session.user._id).then((response)=>{
    res.json({status:true})
  })
})

//product inc&decrmnt button
router.post('/changeProductQuantity',(req,res)=>{
  userHelpers.changeProdQuantity(req.body).then(async (response)=>{
    amount=await userHelpers.totalPrice(req.session.user._id)
    response.total=amount.total
    console.log(response.total) 
    res.json(response)
  })
})

//remove product from cart
router.get('/removeProduct/:id',(req,res)=>{
  userHelpers.removeProd(req.params.id,req.session.user._id).then((response)=>{
    res.json("deleted")
  })
})

//place order address selection
router.get('/place-order',verifyLogin,async(req,res)=>{
let totalPrice= await userHelpers.totalPrice(req.session.user._id)
let walletBal= await userHelpers.userWallet(req.session.user._id)
userHelpers.getAddressList(req.session.user._id).then((addressData)=>{    
  res.render('user/place-order',{user:req.session.user,addressData,totalPrice,walletBal})
})  
})

//place order details
router.post('/place-order',async (req,res)=>{
  let walletAmount=Number(req.body.wallet)
  let orderData=req.body//data from place-order page address radio selection
  let addressDetails= await userHelpers.getUserAddress(orderData)
  let products= await userHelpers.getCartProdList(req.body.userId)
  let couponName= req.body.couponName
  let totalPrice=Number(req.body.total)
  if(walletAmount){
    if(totalPrice>=walletAmount){
      totalPrice=totalPrice-walletAmount
      userHelpers.decrmntWallet(req.session.user._id,walletAmount)     
    }else{
      userHelpers.decrmntWallet(req.session.user._id,totalPrice)
      totalPrice=2
    }
    
  }else{
     totalPrice=totalPrice
  }
  userHelpers.placeOrder(orderData,products,addressDetails,totalPrice,couponName).then((orderId)=>{
    if(req.body.paymentMethod==='COD'){
      res.json({codSuccess:true}) 
    }else if(req.body.paymentMethod==='razorpay'){
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
       res.json({response,razorpay:true})
      })     
    }else{
      req.session.orderId=orderId
      const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/user/success",
            "cancel_url": "http://cancel.url"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "item",
                    "sku": "item",
                    "price": "1.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "1.00"
            },
            "description": "Payment for the product."
        }]
    }
    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error
      } else {
        for(let i=0;i<payment.links.length;i++){
          if(payment.links[i].rel==='approval_url'){
            res.json({url:payment.links[i].href,paypal:true})
          }
        }
          

      }
  })
    }   
      
  })
  
})
//paypal success
router.get('/success', async(req, res) => {
  let userId=req.session.user._id
  let products= await userHelpers.getCartProdList(userId)
  userHelpers.changePaymentStatus(req.session.orderId,userId,products).then(() => {
    req.session.orderId = null
    res.redirect('/user/orders')
  })
})
//razorpay success
router.post('/verify-payment',async(req,res)=>{
  let userId=req.session.user._id
  let products= await userHelpers.getCartProdList(userId)
  userHelpers.verifyPayment(req.body).then(()=>{
    
    userHelpers.changePaymentStatus(req.body['order[response][receipt]'],userId,products).then(()=>{
      console.log('Payment successfull')
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status:false,err:''})
  })
  })

//user profile
router.get('/profile',verifyLogin,(req,res)=>{
  res.render('user/user-profile',{user:req.session.user})
})
//address book
router.get('/addressBook',verifyLogin,(req,res)=>{
  userHelpers.getAddressList(req.session.user._id).then((addressData)=>{
    res.render('user/address-book',{user:req.session.user,addressData})
  })
//wallet
router.get('/wallet',verifyLogin,(req,res)=>{
  userHelpers.userWallet(req.session.user._id).then((walletDetails)=>{
    res.render('user/wallet',{walletDetails,user:req.session.user})
  })
})
 
})
//add address book data
router.post('/addressBook',(req,res)=>{
  let addressData=req.body
  let userId=req.session.user._id
  userHelpers.addressBook(addressData,userId).then((response)=>{
   res.redirect('/user/addressBook')
  })
})

//order page
router.get('/orders',verifyLogin,(req,res)=>{
  userHelpers.deletePending()
  userHelpers.getOrderList(req.session.user._id).then((orders)=>{
    res.render('user/orders',{orders,user:req.session.user})
})
})

//cancel order by user
router.put('/cancelOrder',(req,res)=>{
  orderId=req.body.orderId
  prodId=req.body.prodId
  userHelpers.cancelOrder(orderId,prodId).then((response)=>{
    res.json({status:true})
  })
})
//return order
router.put('/returnOrder',(req,res)=>{
  orderId=req.body.orderId
  prodId=req.body.prodId
  console.log(req.body,"FFFFFFFFFFFFFFFFFFFFFFFFFFF")
  userHelpers.returnOrder(orderId,prodId).then((response)=>{
    res.json({status:true})
  })

})
//redeem coupon
router.post('/redeemCoupon',async(req,res)=>{
let totalPrice= await userHelpers.totalPrice(req.session.user._id)
  productHelpers.redeemCoupon(req.body.couponCode,req.session.user._id).then((couponDetails)=>{
    if(totalPrice.total>=couponDetails.minimumPrice){
      let temp= (couponDetails.percentage*totalPrice.total)/100
      totalPrice=(totalPrice.total-temp)
      res.json({totalPrice:totalPrice,discountAmount:temp,coupon:req.body.couponCode})
    }else{
      let errMsg="The coupon is only applicable for products above ₹"+couponDetails.minimumPrice
      res.json({message:errMsg})
    }
  }).catch(()=>{
    let errMsg="Coupon does not exist or expired"
    res.json({message:errMsg})
  })
})   

module.exports = router;
