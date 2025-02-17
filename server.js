import express from "express";
import cors from "cors";
import multer from 'multer';
import path from 'path';
import mysql from "mysql2";
import dotenv from 'dotenv';
 import jwt from "jsonwebtoken";


dotenv.config();



const app = express();

app.use(cors({
  origin: "*" ,
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));



// app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'))
app.options("*", cors());




app.listen(8081, () => {
  console.log("listening...");
});




// app.use(cors({
//   origin: 'http://localhost:3000', // Allow requests from your React frontend
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));


//test
// -------------------- Host DB ------------------------
// const db = mysql.createConnection({
//   host: ' ',
//   user: 'rooot',
//   port:'3306',
//   password: 'password',
//   database: 'dev_cat',
// });




const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // Optional: Enforce SSL security if using AWS RDS
  }
}); 




//---------------- LOCAL TEST ----------------------
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "devcat",
// });


db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database..");
});


// export default db;



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});



const upload = multer({
  storage: storage
});



// ------------------------ start ----------------------------------
app.get("/", (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Message: "Error inside server" });
    return res.json(result);
  });
});



// ------------------------ profile home(categories) ----------------------------------


app.get("/get_businesses", (req, res) => {
  const sql = "SELECT id, usr_name, usr_logo FROM users WHERE role = 'admin' ";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Message: "Error inside server /get_businesses" });
    return res.json(result);
  });
});


app.get("/home/:id", (req, res) => {
  const sql = "SELECT * FROM categories WHERE business_id = ?";
  const id = req.params.id;
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Message: "Error inside server" });
    return res.json(result);
  });
});



// -------------------------- Login --------------------------------------

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (result.length > 0) {
      const user = result[0];

      const token = jwt.sign(
        { id: user.id, role: user.role, business_id: user.id },  
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({
        token,
        role: user.role,
        business_id: user.id, // ✅ Send `id` as `business_id`
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  });
});


// -------------------------- Register  --------------------------------------

app.post("/register", upload.single("usr_logo"), (req, res) => {
  const { business_name, email, password } = req.body;
  const logoFilename = req.file ? req.file.filename : null;  

  const sql = "INSERT INTO users (usr_name, email, password, role, usr_logo) VALUES (?, ?, ?, 'admin', ?)";
  db.query(sql, [business_name, email, password, logoFilename], (err, result) => {
    if (err) return res.status(500).json({ message: "Error creating user", error: err });

    res.json({ message: "Account registered successfully!", userId: result.insertId });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});



// app.post("/addCategories", upload.single('cat_image'),  (req, res) => {
//   const sql = "INSERT INTO categories (`category_name`,`category_details`,cat_image, business_id) VALUES (?,?,?,?)";
//   const values = [req.body.category_name, req.body.category_details, req.file.filename , req.body.business_id ];

//   db.query(sql, values, (err, result) => {
//     if (err) return res.json(err);
//     const categoryId = result.insertId;
//     return res.json({ categoryId });

//   });
// });


// -------------------------- EDIT CAT --------------------------------------
app.put('/editcat/:categoryId/:businessId',(req,res)=>{
  const sql = "UPDATE categories SET `category_name`= ?, `category_details`= ? WHERE idcategories = ? AND `business_id`= ? ";
  const values = [req.body.category_name, req.body.category_details, req.params.categoryId, req.params.businessId];  

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(sql);
  });
})



// -------------------------- EDIT PROD --------------------------------------
app.put('/editprod/:product_id/:businessId',(req,res)=>{
  const sql = "UPDATE products SET `product_name`= ?, `product_details`= ?, `price`= ? WHERE product_id = ? AND `business_id`= ? ";
  const values = [req.body.product_name, req.body.product_details, req.body.price, req.params.product_id,req.params.businessId]; 

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(sql);
  });
})


// -------------------------- DELETE --------------------------------------

app.delete('/deleteCat/:categoryId/:businessId', (req, res) => {
  const { categoryId, businessId } = req.params;

  // First, delete all products related to this category
  const deleteProducts = "DELETE FROM products WHERE category_id = ? AND business_id = ?";

  db.query(deleteProducts, [categoryId, businessId], (err, result) => {
    if (err) {
      console.error("Error deleting products:", err);
      return res.status(500).json({ message: "Error deleting products" });
    }

    console.log("Products deleted successfully");

    // Now, delete the category
    const deleteCategory = "DELETE FROM categories WHERE idcategories = ? AND business_id = ?";
    
    db.query(deleteCategory, [categoryId, businessId], (err, result) => {
      if (err) {
        console.error("Error deleting category:", err);
        return res.status(500).json({ message: "Error deleting category" });
      }

      return res.json({ message: "Category and related products deleted successfully!" });
    });
  });
});


app.delete('/deleteProd/:product_id/:businessId', (req, res) => {
  const sql = "DELETE FROM products WHERE product_id = ? AND business_id = ?";

  const id = req.params.product_id;
  const businessId = req.params.businessId;

  db.query(sql, [id,businessId], (err, result) => {
    if (err) return res.status(500).json({ message: "Error inside server" });
    return res.json(result);
  });
});



// -------------------  ADD PRODUCT -------------------------
app.post("/addProd/:categoryId", upload.single('product_image'), (req, res) => {
  const categoryId = req.params.categoryId;
  const sql = "INSERT INTO products (`category_id`, `product_name`, `product_details`,product_image,`price`,business_id) VALUES (?,?,?,?,?,?)";
  const values = [categoryId, req.body.product_name, req.body.product_details, req.file.filename, req.body.price,req.body.business_id]; 

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(sql);
  });

});


// ---------------------------- ADD CATEGORY -------------------------------------
app.post("/addCategories", upload.single('cat_image'),  (req, res) => {
  const sql = "INSERT INTO categories (`category_name`,`category_details`,cat_image, business_id) VALUES (?,?,?,?)";
  const values = [req.body.category_name, req.body.category_details, req.file.filename , req.body.business_id ];

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    const categoryId = result.insertId;
    return res.json({ categoryId });

  });
});

 
 
// ------------------------  PRODUCT DETAILS TO EDIT ----------------------------------

app.get('/product/:id/:businessId',(req,res)=>{
  const sql = "SELECT * FROM products WHERE product_id = ? AND business_id = ?" ;
  const { id, businessId } = req.params;
  db.query(sql,[id,businessId],(err,result)=>{
      if(err) return res.json({Message: "Error inside server"});
      return res.json(result);
  })
})





// ------------------------  CATEGORY DETAILS ----------------------------------

app.get('/get_category/:id/:businessId', (req, res) => {
  const sql = "SELECT * FROM categories WHERE idcategories = ? AND business_id = ?";
  const { id, businessId } = req.params;

  db.query(sql, [id, businessId], (err, result) => {
      if (err) return res.json({ Message: "Error inside server" });
      
      if (result.length === 0) {
          return res.status(404).json({ Message: "Category not found or does not belong to this business" });
      }
      
      return res.json(result);
  });
});


 
app.get('/get_products/:id/:businessId', (req, res) => {
  const { id, businessId } = req.params;
  const sql = `
    SELECT  products.business_id, products.product_id, products.product_name, products.product_details,products.price,products.product_image
    FROM products
    INNER JOIN categories ON products.category_id = categories.idcategories
    WHERE  categories.idcategories = ? AND products.business_id = ? 
  `;

  db.query(sql, [id, businessId], (err, result) => {
    if (err) {
      return res.json({ Message: "Error inside server" });
    }
    return res.json(result);
    
  });
});


 
// ------------------------  DISPLAY PRODUCTS ----------------------------------

// app.get('/get_products/:id', (req, res) => {
//   const categoryId = req.params.id;

//   const sql = `
//     SELECT categories.idcategories, categories.category_name, categories.category_details, 
//     products.product_id, products.product_name, products.product_details, products.price, products.product_image
//     FROM categories
//     LEFT JOIN products ON categories.idcategories = products.category_id
//     WHERE categories.idcategories = ?
//   `;

//   db.query(sql, [categoryId], (err, result) => {
//     if (err) {
//       return res.json({ Message: "Error inside server" });
//     }
//     return res.json(result);
//   });
// });

 
