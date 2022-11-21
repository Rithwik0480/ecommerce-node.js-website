const express = require("express");
const router = express.Router();
const MongoClient = require("mongodb").MongoClient;
const productHelpers = require("../helpers/product-helpers");
const adminHelpers = require("../helpers/admin-helpers");
const userHelpers = require("../helpers/user-helpers");
const cloudinary=require('../utils/cloudinary')
//multer
const multer=require("multer")
const path=require("path");
const { response } = require("express");
upload=multer({
    storage:multer.diskStorage({}),
    fileFilter:(req,file,cb)=>{
        let ext=path.extname(file.originalname)
        if(ext!==".jpg" &&ext!==".jpeg" &&ext!==".png" &&ext!==".webp" ){
            cb(new Error("File Type Is Not Supported"),false)
            return
        }
        cb(null,true)
    }
})

//delete route
router.use(function (req, res, next) {
  if (req.query._method == 'DELETE') {
      req.method = 'DELETE';
      req.url = req.path;
  }
  next();
});

//admin login
router.get("/adminLogin", (req, res) => {
  res.render("admin/admin-login", { adminPage: true });
});

router.post("/adminLogin", (req, res) => {
  adminHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminloggedIn = true;
      req.session.admin = response.admin;
      res.redirect("/admin/dashboard");
    } else {
      res.redirect("/adminLogin");
    }
  });
});

//landing page
redirect = function(req, res, next){
  if (!req.session.userid) {
      req.session.redirectTo = req.path;
      next();
  } else {
      next();
  }
}
router.get("/",redirect,(req, res, next) => {
  let user = req.session.user;
  let cartNumber = null;
  if (user) {
    userHelpers.cartCount(req.session.user._id).then((count) => {
      cartNumber = count;
    })
  }
  productHelpers.getAllProducts().then((product) => {
    adminHelpers.dispalyBanner().then((bannerData)=>{
      res.render('index',{product, user, cartNumber,bannerData})
    })
  })
})

//admin all-products list
router.get("/admin/viewProducts", (req, res, next) => {
  productHelpers.getAllProducts().then((product) => {
    res.render("admin/view-products", { admin: true, product });
  })
})

//display add product form
router.get("/admin/add-product", (req, res) => {
  adminHelpers.getCategories().then((response) => {
    res.render("admin/add-product", { response, admin: true })
  })
})

//add product form data
router.post("/admin/add-product",upload.fields([
{name:"image1",maxCount:1},
{name:"image2",maxCount:1},
{name:"image3",maxCount:1},
{name:"image4",maxCount:1}
]),async (req, res) => {
  const cloudinaryUpload=(file)=> {
    return new Promise((resolve,reject)=>{
      cloudinary.uploader.upload(file,(err,res)=> {
        if(err)
          return res.status(500).send("upload image error")
          resolve(res.secure_url)
        
      })
    })
  }
  const files=req.files
  let arr1=Object.values(files)
  let arr2=arr1.flat()
  const urls=await Promise.all(
    arr2.map(async(file)=>{
      const {path}=file
      const result=await cloudinaryUpload(path)
      return result
    })
  )
  
  productHelpers.addProduct(req.body,urls,(id) => {
    /*productImage is fieldname in add-product form*/
   res.redirect("/admin/add-product")
    
  })
})
//delete product
router.get("/admin/deleteProduct/:id", (req, res) => {
  let productId = req.params.id;
  productHelpers.deleteProduct(productId).then((response) => {
    res.redirect("/admin/viewProducts");
  })
})
//edit product
router.get("/admin/editProduct/:id", (req, res) => {
  let productId = req.params.id;
  productHelpers.viewDetails(productId).then((prodData) => {
    res.render("admin/edit-product", { admin: true, prodData })
  })
})
router.post("/admin/editProduct/:id", (req, res) => {
  let prodId = req.params.id;
  productHelpers.editProduct(prodId, req.body).then(() => {
    res.redirect("/admin/viewProducts");
  })
})

//user management
router.get("/admin/viewUsers", (req, res) => {
  adminHelpers.getAllUsers().then((users) => {
    res.render("admin/view-users", { admin: true, users })
  })
})

router.get("/admin/statusUpdate/:id", (req, res) => {
  let userId = req.params.id;

  adminHelpers.updateStatus(userId).then((statusUpdated) => {
    res.redirect("/admin/viewUsers");
  })
})

//category management
router.get("/admin/manageCategory", (req, res) => {
  adminHelpers.getCategories().then((response) => {
    res.render("admin/manage-category", { response, admin: true })
  })
})

router.post("/admin/manageCategory", (req, res) => {
  adminHelpers.setCategory(req.body).then((response) => {
    res.redirect("/admin/manageCategory")
  })
})

router.get("/admin/manageCategory/:id", (req, res) => {
  adminHelpers.deleteCategory(req.params.id).then((response) => {
    res.redirect("/admin/manageCategory")
  })
})

//order management
router.get("/admin/orders", (req, res) => {
  adminHelpers.getOrderlist().then((orders) => {
    res.render("admin/order-history", { admin: true, orders })
  })
})

//upadate product status
router.put("/admin/orderStatus", (req, res) => {
  adminHelpers.updateProdStatus(req.body).then((response) => {
    res.json({ status: true })
  });
});
//banner management
router.get("/admin/manage-banner",(req,res)=> {
  adminHelpers.dispalyBanner().then((bannerData)=>{
    res.render('admin/banner',{admin:true,bannerData})
  })
})

router.post("/admin/manage-banner",upload.single("bannerImage"),async(req,res)=> {
  bannerData=req.body
  const result=await cloudinary.uploader.upload(req.file.path)
  let image_url=result.secure_url
  adminHelpers.addBanner(bannerData,image_url).then((response)=> {
    res.redirect("/admin/manage-banner")
  })

})

//sales report
router.get("/admin/sales-report", async (req, res) => {
  if (req.query?.month) {
    let month = req.query?.month.split("-");
    let [yy, mm] = month;
    deliveredOrders = await adminHelpers.deliveredOrderList(yy, mm)
  }else if (req.query?.daterange){
    deliveredOrders = await adminHelpers.deliveredOrderList(req.query)
  }else{
    deliveredOrders = await adminHelpers.deliveredOrderList()
  }

  let totalRevenue=await adminHelpers.getTotalRevenue(deliveredOrders)
  res.render("admin/sales-report", { admin: true, deliveredOrders,totalRevenue})
})

//dashboard graph
router.get("/admin/dashboard:days",(req,res)=>{
  adminHelpers.barGraph().then((response)=>{
  res.json(response) 
  }) 
})
//dashboard
router.get("/admin/dashboard",async(req,res)=>{
deliveredOrders = await adminHelpers.deliveredOrderList()
totalOrders=deliveredOrders.length
activeUsers=await adminHelpers.getActiveUsers()
let totalRevenue=await adminHelpers.getTotalRevenue(deliveredOrders)
res.render('admin/dashboard',{admin: true, totalOrders,totalRevenue,activeUsers})
})

//dashboard pie chart
router.get("/admin/dashboard/piechart",(req,res)=>{
  adminHelpers.pieChart().then((response)=>{
    res.json(response)
  })
})

//dashboard vertical bar
router.get("/admin/dashboard/verticalBar",(req,res)=>{
  adminHelpers.verticalBar().then((response)=> {
    res.json(response)
  })
})



//product offers
router.get("/admin/offers",async(req,res)=>{
category= await adminHelpers.getCategories()
product= await productHelpers.getAllProducts()
productOffer=await productHelpers.getProductOffer()
categoryOffer=await productHelpers.getCategoryOffer()
  res.render('admin/offers',{admin:true,category,product,productOffer,categoryOffer})
})

router.post("/admin/offers/product-offers",(req,res)=>{
  productHelpers.addProductOffer(req.body).then((response)=>{
    res.json({status:true})
  })
})
//delete product offer
router.post("/admin/offer/deleteProdOffer",(req,res)=>{
  let prodId=req.body.prodId
  productHelpers.deleteProdOffer(prodId).then((response)=>{
    res.json({status:true})
  })
})

//add category offers
router.post("/admin/offers/category-offers",(req,res)=>{
productHelpers.addCategoryOffer(req.body).then((response)=>{
  let catOfferDetails=req.body
  res.redirect('/admin/offers')
})
})
//delete category offer
router.post("/admin/offer/delete-category-offer",(req,res)=>{
  let categoryName=req.body.categoryName
  productHelpers.deleteCatOffer(categoryName).then(()=>{
    res.json({status:true})
  })
})

//add coupon
router.post("/admin/coupon",(req,res)=>{
  productHelpers.addCoupon(req.body).then((response)=>{
    res.json({status:true})
  }).catch((response)=>{
    res.json({status:false})
  })                
})
//get coupon
router.get("/admin/coupon",async(req,res)=>{
let coupons=await productHelpers.getCoupon()
res.render("admin/coupon",{admin:true,coupons})
})
//delete coupon
router.delete("/admin/coupon",(req,res)=>{
  productHelpers.deleteCoupon(req.body.couponId).then((response)=>{
    res.json({status:true})
  })
})



module.exports = router;
