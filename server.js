import express from "express";
import cors from "cors";
import mysql from "mysql2";
import multer from 'multer';
import path from 'path';


 

// const storage = multer.memoryStorage(); // Store images in memory, adjust as needed
// const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('images'))


app.listen(8081, () => {
  console.log("listening :D");
});


// -------------------- Host DB ------------------------
// const db = mysql.createConnection({
//   host: 'ko9.h.filess.io',
//   user: 'devcat_bridgebear',
//   port:'3306',
//   password: 'a056189ceb3d662d06f98dcbe9503d1810155971',
//   database: 'devcat_bridgebear',
//   authPlugins: {
//     mysql_clear_password: () => () => Buffer.from('root')
//   }
// });


//---------------- LOCAL TEST ----------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "devcat",
});


db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});




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



// ------------------------ HOME ----------------------------------
app.get("/", (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Message: "Error inside server" });
    return res.json(result);
  });
});



// -------------------  ADD PRODUCT -------------------------
app.post("/addProd/:categoryId", upload.single('product_image'), (req, res) => {
  const categoryId = req.params.categoryId;
  const sql = "INSERT INTO products (`category_id`, `product_name`, `product_details`,product_image,`price`) VALUES (?, ?, ?,?,?)";
  const values = [categoryId, req.body.product_name, req.body.product_details, req.file.filename, req.body.price,]; 

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(sql);
  });

});



// -------------------------- EDIT CAT --------------------------------------
app.put('/editcat/:categoryId',(req,res)=>{
  const sql = "UPDATE categories SET `category_name`= ?, `details`= ? WHERE idcategories = ?";
  const values = [req.body.category_name, req.body.details, req.params.categoryId];  

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(result);
  });
})



// -------------------------- EDIT PROD --------------------------------------
app.put('/editprod/:product_id',(req,res)=>{
  const sql = "UPDATE products SET `product_name`= ?, `product_details`= ?, `price`= ? WHERE product_id = ?";
  const values = [req.body.product_name, req.body.product_details, req.body.price, req.params.product_id]; 

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    return res.json(sql);
  });
})


// -------------------------- DELETE --------------------------------------

app.delete('/deleteCat/:categoryId', (req, res) => {
  const sql = "DELETE categories, products FROM categories LEFT JOIN products ON categories.idcategories = products.category_id WHERE categories.idcategories = ?";
  const id = req.params.categoryId;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error inside server" });
    return res.json(result);
  });
});

app.delete('/deleteProd/:product_id', (req, res) => {
  const sql = "DELETE products FROM products WHERE products.product_id = ?";
  const id = req.params.product_id;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error inside server" });
    return res.json(result);
  });
});



// ---------------------------- ADD CAT -------------------------------------
app.post("/categories", upload.single('cat_image'),  (req, res) => {
  const sql = "INSERT INTO categories (`category_name`,`category_details`,cat_image) VALUES (?,?,?)";
  const values = [req.body.category_name, req.body.category_details, req.file.filename];

  db.query(sql, values, (err, result) => {
    if (err) return res.json(err);
    const categoryId = result.insertId;
    return res.json({ categoryId });

  });
});


// app.post('/upload/:categoryId', upload.single('image'), (req, res)  => {
//   const categoryId = req.params.categoryId;
//   const sql = "UPDATE products SET image WHERE category_id = ?";
//   const values = [categoryId, req.file.filename];  
//   db.query(sql, values, (err, result) => {
//     if (err) return res.json(err);
//     return res.json(result);
//   });
// });


 
// ------------------------  PRODUCT DETAILS TO EDIT ----------------------------------

app.get('/product/:id',(req,res)=>{
  const sql = "SELECT * FROM products WHERE product_id = ?" ;
  const id =  req.params.id;
  db.query(sql,[id],(err,result)=>{
      if(err) return res.json({Message: "Error inside server"});
      return res.json(result);
  })
})

// ------------------------  CATEGORIE DETAILS ----------------------------------

app.get('/get_category/:id',(req,res)=>{
  const sql = "SELECT * FROM categories WHERE idcategories = ?" ;
  const id =  req.params.id;
  db.query(sql,[id],(err,result)=>{
      if(err) return res.json({Message: "Error inside server"});
      return res.json(result);
  })
})

 
app.get('/get_product/:id', (req, res) => {
  const categoryId = req.params.id;
  const sql = `
    SELECT products.product_id, products.product_name, products.product_details
    FROM products
    INNER JOIN categories ON products.category_id = categories.id
    WHERE categories.id = ?
  `;

  db.query(sql, [categoryId], (err, result) => {
    if (err) {
      return res.json({ Message: "Error inside server" });
    }
    return res.json(result);
  });
});

 
// ------------------------  DISPLAY PRODUCTS ----------------------------------

app.get('/get_products/:id', (req, res) => {
  const categoryId = req.params.id;

  const sql = `
    SELECT categories.idcategories, categories.category_name, categories.category_details, 
    products.product_id, products.product_name, products.product_details, products.price, products.product_image
    FROM categories
    LEFT JOIN products ON categories.idcategories = products.category_id
    WHERE categories.idcategories = ?
  `;

  db.query(sql, [categoryId], (err, result) => {
    if (err) {
      return res.json({ Message: "Error inside server" });
    }
    return res.json(result);
  });
});

 
