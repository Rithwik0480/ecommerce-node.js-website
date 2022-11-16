//Otp login
$("#numberVerify").submit((e)=>{
  e.preventDefault()
  $.ajax({
    url:"/user/verifyNumber",
    method:"post",
    data: $("#numberVerify").serialize(),
    success:(response)=>{
      //response.mg is error case
      if(response.msg){
      $("#inputNumber").css('border-color','red')
      $("#invalidNumber").text(response.msg)
      }else{
        $("#exampleModalToggle2").modal('show')
        $("#exampleModalToggle").modal('hide')
        phoneNumber= response.phoneNumber.slice(0,5)+"******"+response.phoneNumber.slice(11,13)
        $("#mobNo").text(phoneNumber)
        $("#phNumber").val(response.phoneNumber)

      }
    }
  })
})
//otp confirm
$("#otpConfirm").submit((e)=>{
  e.preventDefault()
  $.ajax({
  url:"/user/otpVerification",
  method:"post",
  data: $("#otpConfirm").serialize(),
  success:(response)=>{
    if(response.status){
      console.log("redirecting");
      location.href="/"
    }else{
      console.log("error")
      $("#invalidOtp").text("The OTP entered is invalid")


    }

  }
})
})
//add to cart button Ajax
function addToCart(prodId) {
  $.ajax({
    url: "/user/addToCart/" + prodId,
    method: "get",
    success: (response) => {
      if (response.status) {
        let count = $("#cart-count").html();
        count = parseInt(count) + 1;
        $("#cart-count").html(count);

        swal({
          title: "Product added to cart",
          text: false,
          timer: 800,
          showConfirmButton: false,
        })
      }else if(response.exist){
        swal({
          title: "Product added to cart",
          text: false,
          timer: 800,
          showConfirmButton: false,
        })
      }
      else{
        location.href="/user/login"
      }
      // location.reload()
    },
  });
}

//inc&decrement quantity button in user cart
function changeQuantity(cartId, prodId, stock, count) {
   let quantity = parseInt(document.getElementById(prodId).value)
  count = parseInt(count)
  console.log(quantity,'q');
  console.log(stock,'s');
  quantityCheck = quantity + count
  console.log(quantityCheck,'qc');
  stock = parseInt(stock)
  if (quantityCheck <= stock && quantityCheck != 0) {
    document.getElementById("minus" + prodId).classList.remove("invisible")
    document.getElementById("plus" + prodId).classList.remove("invisible")
    $.ajax({
      url: '/user/changeProductQuantity',
      data: {
        // user: userId,
        cart: cartId,
        product: prodId,
        count: count,
        quantity: quantity
      },
      method: 'post',
      success: (response) => {
        console.log(response);
        if (response.removeProduct) {
          location.reload()
        } else {
          document.getElementById(prodId).value = quantity + count;
          document.getElementById('total').innerHTML = response.total
        }
      }
    })
  }
  if (quantityCheck == 1) {
    document.getElementById("minus" + prodId).classList.add("invisible")
  }
  if (quantityCheck == stock) {
    document.getElementById("plus" + prodId).classList.add("invisible")
  }
}

//remove product from User cart
function removeProd(prodId) {
  swal(
    {
      title: "Are you sure?",
      text: "You want to delete this product permanently",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff0000",
      confirmButtonText: "delete",
      cancelButtonText: "cancel",
      closeOnConfirm: false,
      closeOnCancel: false,
    },
    function (isConfirm) {
      if (isConfirm) {
        $.ajax({
          url: "/user/removeProduct/" + prodId,
          method: "get",
          success: (response) => {
            location.reload();
            // document.getElementById(prodId).classList.remove(prodId)
          },
        });
      } else {
        location.reload();
      }
    }
  );
}

//checkout form
$("#checkout-form").submit((e) => {
  e.preventDefault();
  $.ajax({
    url: "/user/place-order",
    type: "post",
    data: $("#checkout-form").serialize(),
    success: (response) => {
      if (response.codSuccess){
        swal(
          {
            title: "Order Placed Successfully",
            text: "go to orders for more details",
            icon: "success",
            confirmButtonColor: "#000",
            confirmButtonText: "Goto orders",
            closeOnConfirm: false,
          },
          function (isConfirm) {
            if (isConfirm) {
              location.href = "/user/orders";
            }
          }
        );
      } else if (response.razorpay) {
        razorpayPayment(response);
      } else if (response.paypal) {
        location.href = response.url;
      }
    },
  });
});

//razor pay function
function razorpayPayment(order) {
  var options = {
    key: "rzp_test_VwYmn71lxuv9wv", // Enter the Key ID generated from the Dashboard
    amount: order.response.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
    currency: "INR",
    name: "Sneaker Game",
    description: "Test Transaction",
    image: "https://example.com/your_logo",
    order_id: order.response.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    handler: function (response) {
      // alert(response.razorpay_payment_id);
      // alert(response.razorpay_order_id);
      // alert(response.razorpay_signature)

      verifyPayment(response, order);
    },
    prefill: {
      name: "Gaurav Kumar",
      email: "gaurav.kumar@example.com",
      contact: "9999999999",
    },
    notes: {
      address: "Razorpay Corporate Office",
    },
    theme: {
      color: "#3399cc",
    },
  };
  var rzp1 = new Razorpay(options);

  rzp1.open();
}

function verifyPayment(payment, order) {
  $.ajax({
    url: "/user/verify-payment",
    data: {
      payment,
      order,
    },
    method: "post",
    success: (response) => {
      if (response.status) {
        location.href = "/user/orders";
      } else {
        alert("Payment failed");
      }
    },
  });
}
//admin product status update
function changeStatus(prodId, orderId) {
  let status = document.getElementById(prodId + orderId).value;
  $.ajax({
    url: "/admin/orderStatus",
    data: {
      orderId,
      prodId,
      status,
    },
    method: "put",
    success: (response) => {
      if (response.status)
        document.getElementById(orderId + prodId).innerHTML = status;
      location.reload();
    },
  })
}
//Cancel order by user
function cancelOrder(orderId,prodId) {
  $.ajax({
    url: "/user/cancelOrder",
    method: "put",
    data:{
      orderId,
      prodId
    },
    success: (response) => {
      if (response.status) location.reload();
    },
  })
}
//return order
function returnOrder(orderId,prodId){
  $.ajax({
    url:"/user/returnOrder",
    method:"put",
    data:{
      orderId,
      prodId
    },
    success: (response) => {
      if (response.status) location.reload();
    }
  })
}
//otp validate
function otpValidate() {
  const code = document.getElementById("code");
  const error = document.getElementsByClassName("invalid-feedback");

  if (code.value.trim() === "" || code.value.length < 6) {
    error.style.display = "block";
    error.innerHTML = "Enter code";
    pass.style.border = "2px solid red";
    return false;
  } else {
    error.innerHTML = "";
    pass.style.border = "2px solid none";
  }

  return true;
}
//for show password check box
function myFunction() {
  var x = document.getElementById("myInput");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

//delete product btn - Admin
function deleteProduct() {
  event.preventDefault(); // prevent form submit
  var form = event.target.form; // storing the form
  swal(
    {
      title: "Are you sure?",
      text: "You want to delete this product permanently",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff0000",
      confirmButtonText: "delete",
      cancelButtonText: "cancel",
      closeOnConfirm: false,
      closeOnCancel: false,
    },
    function (isConfirm) {
      if (isConfirm) {
        form.submit(); // submitting the form when user press yes
      } else {
        swal("Cancelled", "Your Product Is Safe", "error");
      }
    }
  );
}

//product details page
function changeImage(id) {
  var img = document.getElementById("image");
  var src = document.getElementById(id).src;
  img.src = src;
  return false;
}

//productzoom
var options = {
  
  width: 400,
  zoomWidth: 500,
  offset: { vertical: 100, horizontal: 10 },
  scale: 0.5,
};
new ImageZoom(document.getElementById("img-container"), options);

//DATE RANGE PICKER
$(function () {
  $('input[name="daterange"]').daterangepicker(
    {
      opens: "left",
    },
    function (start, end, label) {
      console.log(
        "A new date selection was made: " +
          start.format("YYYY-MM-DD") +
          " to " +
          end.format("YYYY-MM-DD")
      );
    }
  );
});

// pdf export
$(document).ready(function ($) {
  $(document).on("click", ".btn_print", function (event) {
    event.preventDefault();
    let element = document.getElementById("container_content");

    let randomNumber = Math.floor(Math.random() * (10000000000 - 1)) + 1;

    let opt = {
      margin: 0,
      filename: "Sneaker Game(Sales Report)" + randomNumber + ".pdf",
      html2canvas: { scale: 10 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  });
});

// excel export

function export_data() {
  let data = document.getElementById("container_content");
  var fp = XLSX.utils.table_to_book(data, { sheet: "sneakerGame" });
  XLSX.write(fp, {
    bookType: "xlsx",
    type: "base64",
  });
  XLSX.writeFile(fp, "Sneaker Game(Sales Report).xlsx");
}

//dashboard page
window.addEventListener("load", () => {
  barFunction(1);
  pieFunction();
  vertbarFunction()
});

//vertical bar graph
function vertbarFunction(){
  $.ajax({
    url: "/admin/dashboard/verticalBar",
    method: "get",
    success: (response) => {
      if (response) {
        var xValues = [
          "Men",
          "Women",
          "Sneakers",
          "Sports",
        ];
        var yValues = [
          response.men,
          response.women,
          response.sneaker,
          response.sports,  ];

        new Chart(document.getElementById("bar-chart-horizontal"), {
          type: 'horizontalBar',
          data: {
            labels: [
              "Men",
              "Women",
              "Sneakers",
              "Sports",
            ],
            datasets: [
              {
                label: "Products Sold(quantity)",
                backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(255, 159, 64, 0.2)',
                  'rgba(255, 205, 86, 0.2)',
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(153, 102, 255, 0.2)',
                  'rgba(201, 203, 207, 0.2)'
                ],    borderColor: [
                  'rgb(255, 99, 132)',
                  'rgb(255, 159, 64)',
                  'rgb(255, 205, 86)',
                  'rgb(75, 192, 192)',
                  'rgb(54, 162, 235)',
                  'rgb(153, 102, 255)',
                  'rgb(201, 203, 207)'
                ],
                borderWidth: 1,
                data: [
                  response.men,
                  response.women,
                  response.sneaker,
                  response.sports,
                  0, 
                ]
              }
            ]
          },
          options: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Category Based Sales'
            }
          }
      });
      }
    },
  });
}
//bar graph
function barFunction(days) {
  $.ajax({
    url: "/admin/dashboard" + days,
    method: "get",
    success: (response) => {
      if (response) {
        var xValues = [
          "delivered",
          "cancelled",
          "shipped",
          "pending",
          "placed",
        ];
        var yValues = [
          response.deliveredCount,
          response.cancelledCount,
          response.shippedCount,
          response.pendingCount,
          response.placedCount,
        ];
        
        new Chart("myChart", {
          type: "bar",
          data: {
            labels: xValues,
            datasets: [
              {
                backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(255, 159, 64, 0.2)',
                  'rgba(255, 205, 86, 0.2)',
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(153, 102, 255, 0.2)',
                  'rgba(201, 203, 207, 0.2)'
                ],    borderColor: [
                  'rgb(255, 99, 132)',
                  'rgb(255, 159, 64)',
                  'rgb(255, 205, 86)',
                  'rgb(75, 192, 192)',
                  'rgb(54, 162, 235)',
                  'rgb(153, 102, 255)',
                  'rgb(201, 203, 207)'
                ],
                borderWidth: 1,
                data: yValues,
              },
            ],
          },
          options: {
            legend: { display: false },
            title: {
              display: true,
              text: "Order Status Chart",
            },
            scales: {
              yAxes: [{ ticks: { min: 0 } }],
            },
          },
        });
      }
    },
  });
}
//pie chart
function pieFunction(){
  $.ajax({
    url: "/admin/dashboard/piechart",
    method: "get",
    success: (response) => {
      if (response) {
        var xValues = [
          "COD",
          "Razorpay",
          "Paypal",
        ];
        var yValues = [
          response.razorpayCount,
          response.codCount,
          response.paypalCount
        ];

        // var barColors = ["red", "green", "blue", "orange", "brown"];

        new Chart(document.getElementById("doughnut-chart"), {
          type: 'doughnut',
          data: {
            labels: ["COD", "Razorpay", "Paypal"],
            datasets: [
              {
                label: "Population (millions)",
                backgroundColor: [
                  'rgb(255, 99, 132)',
                  'rgb(54, 162, 235)',
                  'rgb(255, 205, 86)'
                ],
                data: [response.codCount,response.razorpayCount,response.paypalCount]
              }
            ]
          },
          options: {
            title: {
              display: true,
              text: 'Payment Method Info'
            }
          }
        })
      }
    },
  });
}

function deleteProdOffer(prodId) {
  swal(
    {
      title: "Are you sure?",
      text: "You want to remove product offer",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff0000",
      confirmButtonText: "delete",
      cancelButtonText: "cancel",
      closeOnConfirm: false,
      closeOnCancel: false,
    },
    function (isConfirm) {
      if (isConfirm) {
        $.ajax({
          url: "/admin/offer/deleteProdOffer",
          type: "post",
          data: {
            prodId,
          },
          success: (response) => {
            location.reload();
          },
        });
      } else {
        swal("Cancelled", "Product Offers Not Changed", "error");
      }
    }
  );
}

//add product
$("#addProductOffers").submit((e) => {
  e.preventDefault();
  $.ajax({
    url: "/admin/offers/product-offers",
    type: "post",
    data: $("#addProductOffers").serialize(),
    success: (response) => {
      if (response.status) {
        location.reload();
      }
    },
  });
});

//delete category offer
function deleteCatOffer(categoryName) {
  $.ajax({
    url: "/admin/offer/delete-category-offer",
    method: "post",
    data: { categoryName },
    success: () => {
      location.reload();
    },
  });
}

//add coupon
$("#add-coupon-form").submit((e) => {
  e.preventDefault();
  $.ajax({
    url: "/admin/coupon",
    method: "post",
    data: $("#add-coupon-form").serialize(),
    success: (response) => {
      if (response.status) {
        location.reload();
      } else {
        swal({
          title: "The Coupon Already Exists",
          text: false,
          timer: 1000,
          showConfirmButton: false,
        });
      }
    },
  });
});
//delete coupon
function deleteCoupon(couponId) {
  swal(
    {
      title: "Are you sure?",
      text: "You want to remove this coupon",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff0000",
      confirmButtonText: "delete",
      cancelButtonText: "cancel",
      closeOnConfirm: true,
      closeOnCancel: false,
    },
    function (isConfirm) {
      if (isConfirm) {
        $.ajax({
          url: "/admin/coupon",
          method: "delete",
          data: { couponId },
          success: (response) => {
            $("#" + couponId).remove();
          },
        });
      } else {
        swal("Cancelled", "Your Coupon Is Safe", "error");
      }
    }
  );
}
//coupon form
$("#redeemCoupon").submit((e) => {
  e.preventDefault();
  $.ajax({
    url: "/user/redeemCoupon",
    method: "post",
    data: $("#redeemCoupon").serialize(),
    success: (response) => {
      if (response.message) {
        $("#couponErr").text(response.message);
        $("#total-amount").val(response.totalPrice);
      } else {
        $("#couponAmount").text(response.discountAmount);
        $("#finalPrice").text(response.totalPrice);
        $("#total-amount").val(response.totalPrice);
        $("#couponErr").text("");
        $("#coupon-name").val(response.coupon);
      }
    },
  });
});
//edit address
function editAddress(addressId,userId){
$.ajax({
  url:"/user/editAddress",
  method:"get",
  data:{
    addressId
  },
  success:(addressData)=>{
  console.log(addressData[0].address.firstName)
  $('#editFirstName').val(addressData[0].address.firstName)
  $('#editLastName').val(addressData[0].address.lastName)
  $('#editaddress').val(addressData[0].address.address)
  $('#editzipcode').val(addressData[0].address.zipcode)
  $('#editcity').val(addressData[0].address.city)
  $('#editstate').val(addressData[0].address.state)
  $('#editcountry').val(addressData[0].address.country)
  $('#editphoneNumber').val(addressData[0].address.phoneNumber)
  $('#editAddressId').val(addressData[0].address._id)
   }
})
}