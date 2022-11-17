const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const amqplib = require('amqplib');

//---MONGO DB----//
 
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/test01"

mongoose.connect(MONGO_URL,{useNewUrlParser: true,useUnifiedTopology: true})
const db = mongoose.connection

db.on('error',(err)=>{
	console.log(err)
})
db.once('open',()=>{
	console.log('DB WORKING')
});

//-----RABBITMQ-----//

async function rabbit(msg) {
	const queueName = "title"
	const connection = await amqplib.connect('amqp://localhost');
	const channel = await connection.createChannel();
	await channel.assertQueue(queueName);

	channel.sendToQueue(queueName, Buffer.from(msg));
	console.log('Sent: ',msg);
	setTimeout(()=>{
		connection.close();
	},0)
}


//-----EXPRESS------//
const app = express();
app.use(bodyParser.urlencoded({
    extended:true
}))

const PORT = process.env.PORT || 3000
app.listen(PORT, (req,res)=>{
  console.log("server for Site is running on port "+PORT);
});


//-----LOAD HTML-------//  
app.get("/",(req,res)=> {
  res.sendFile(__dirname + "/index.html");
});


//-------SHEMA---------//
	
const jobSchema = new mongoose.Schema({
	name:String,
	salary:String,
	type:String,
	company:String,
	location:String
});

const SCRAP_URL = process.env.SCRAP_URL || "http://localhost:3001"

//------POST------//
app.post("/",(req,res)=>{
	const title=req.body.title
	const jobModel = mongoose.model(req,jobSchema,title)

	jobModel.find().then((result)=>{
		if (result.length !== 0){
		res.end(JSON.stringify(result,null,'\t'))
	}else {
		rabbit(title)
	}
	}).catch((err)=>{
		console.log(err)
	})

});