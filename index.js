const express = require('express')
const app = express()
const path = require('path') 
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const cors=require("cors")
const PORT=3000;
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

app.use(express.json())
app.use(cors())


const dbpath = path.join(__dirname, 'database.db')

let db = null

const initalizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(PORT, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error ${e.message}`)
    process.exit(1)
  }
}


initalizeDBAndServer()



const authenticateAPI=async (request,response,next)=>{
  const authHeaders=request.headers["authorization"]
  let jwtToken; 
  if (authHeaders!==undefined){
    jwtToken=authHeaders.split(" ")[1]
    
  }
  if (jwtToken===undefined){
    response.status(401)
    response.end("Invalid jwt token")
  }else{
    await jwt.verify(jwtToken,"Gopi",async (error,payload)=>{
      if (error){
        response.status(401)
        response.end("Invalid jwt token")
      }else{
        request.username=payload.username
        request.email=payload.email
        next();
      }
    })
  }

}



// Register new user API 
app.post("/register",async (request,response)=>{
    try{
      const {username,email,password}=request.body;
      const hashedPassword = await bcrypt.hash(password,10)
  
      const selectUser=`SELECT * FROM user WHERE email="${email}" ;`
      const dbUser=await db.get(selectUser)
     if (dbUser===undefined){
      const query=`INSERT INTO user(username,email,password)VALUES(
        "${username}","${email}","${hashedPassword}"
      );`;
     await db.run(query)
      response.send("successfully Registered");
      
     }else{
      response.status(400)
      response.send("User Already Exists")
     }
    
    }
    catch(e){
      console.log(`DB Error is ${e.message}`)
    }
  })
  
// login API
  app.post("/login",async (request,response)=>{
    const {email,password}=request.body 
    const selectUser=`SELECT * FROM user WHERE email="${email}";`
    const dbUser=await db.get(selectUser)
    if (dbUser===undefined){
      response.status(400)
      response.send("Invalid User")
    }else{
      isPasswordMatch= await bcrypt.compare(password,dbUser.password); 
      if (isPasswordMatch===true){
        const payload={username:selectUser.username,email:email}
  
        const jwt_token= await jwt.sign(payload,"Gopi")
        response.send({jwt_token})
        
      }else{
        response.status(400)
        response.send("Invalid Password")
      }
    }
  
  })
  
  app.get("/users",authenticateAPI,async (request,response)=>{
    const query=`SELECT * FROM user;`;
    const users=await db.all(query)
    response.send(users)
})
// Specific user API
app.get("/user/:id",authenticateAPI,async (request,response)=>{
    const id=request.params.id;
    const query=`SELECT * FROM user WHERE id=${id};`;
    const user=await db.get(query)
    response.send(user)
})


// posts API

app.get("/posts",authenticateAPI,async (request,response)=>{
    try{
        const getAllPosts=`SELECT * FROM post;`;
        const dbResponse=await db.all(getAllPosts)
        response.status(200).json(dbResponse)
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

// specific post user
app.get("/posts/:id",authenticateAPI,async (request,response)=>{
    try{
        const id=request.params.id;
        const getPostByUserId=`SELECT * FROM post WHERE id=${id};`;
        const dbResponse=await db.all(getPostByUserId)
        response.status(200).json(dbResponse)
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

// Create a new post.
app.post("/posts",authenticateAPI,async (request,response)=>{
    try{
        const {title,imageUrl,avatarUrl,author,topic,content}=request.body;
        const insertNewPost=`INSERT INTO post(title,image_url,avatar_url,author,topic,content) VALUES("${title}","${imageUrl}","${avatarUrl}","${author}","${topic}","${content}");`;
        await db.run(insertNewPost)
        response.status(201).send("Post created successfully")
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

app.put("/posts/:id",authenticateAPI,async (request,response)=>{
    try{
        const id=request.params.id;
        const {title, imageUrl,avatarUrl,author,topic,content}=request.body;
        const updatePost=`UPDATE post SET title="${title}", image_url="${imageUrl}", avatar_url="${avatarUrl}", author="${author}", topic="${topic}", content="${content}" WHERE id=${id};`;
        await db.run(updatePost)
        response.status(200).send("Post updated successfully")
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

app.delete("/posts/:id",authenticateAPI,async (request,response)=>{
    try{
        const id=request.params.id;
        const deletePost=`DELETE FROM post WHERE id=${id};`;
        await db.run(deletePost)
        response.status(200).send("Post deleted successfully")
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

app.get("/search",authenticateAPI,async(request,response)=>{

    try{
        const {search_q}=request.query;
        const searchPostQuery=`SELECT * FROM post WHERE title LIKE "%${search_q}%";`;
        const dbResponse=await db.all(searchPostQuery)
        response.status(200).json(dbResponse)
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

// comments API


app.post("/add-comment",authenticateAPI,async(request,response)=>{
    try{
        const {description,published}=request.body;
        const insertNewComment=`INSERT INTO comment(description,published) VALUES(${description},"${published}");`;
        await db.run(insertNewComment)
        response.status(201).send("Comment added successfully")
    }catch(e){
        response.status(500).json({message:e.message})
    }
})

app.get("/comments",authenticateAPI,async(request,response)=>{
    const getAllComments=`SELECT * FROM comment;`;
    const dbResponse=await db.all(getAllComments)
    response.status(200).json(dbResponse)
})

app.get("/posts/:id/comments",authenticateAPI,async (request,response)=>{
    try{
        const id=request.params.id;
        const getCommentsByPostId=`SELECT * FROM comment WHERE post_id=${id};`;
        const dbResponse=await db.all(getCommentsByPostId)
        response.status(200).json(dbResponse)
    }catch(e){
        response.status(500).json({message:e.message})
    }
})


app.get("/",async (request,response)=>{
    response.send("Welcome to ZUI Assignment ")
})
