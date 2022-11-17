const puppeteer = require('puppeteer');
const confJson = require('../conf.json');
const amqplib = require('amqplib')
const mongoose = require('mongoose');


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


//-------Puppeteer-------//

async function getElement(page,content,element){
  await page.waitForXPath(element)
  const [elementHandle] = await page.$x(element)
  const elementContent = await page.evaluate(name => name.textContent, elementHandle);
  content.element = elementContent

}

async function getContent(url,salary,name,company,location,type){
  const content = new Object()

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36");
  await page.goto(url);

  getElement(page,content,salary)
  getElement(page,content,name)
  getElement(page,content,company)
  getElement(page,content,location)
  getElement(page,content,type)

  db.collection(title).insertOne(content,function(err,res){
    if (err) throw err;
    console.log(content)
  })

  await browser.close();
}

//-------rabbitMQ-------//

async function rabbitGet(){
  const queueName = "job"
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);
  console.log("Waiting for messages in queue: ",queueName);
  channel.consume(queueName,async (msg)=>{
    let payload = JSON.parse(msg.content.toString())

    let title=payload.title
    let job = payload.job
    let id = job.slice(12,job.indexOf("m/")+1)
    for (const site of confJson){
      if (id==site.id){
        const salary=site.salary
        const name=site.name
        const company=site.company
        const location=site.location
        const type=site.type


        getContent(job,salary,name,company,location,type,title)
      }
    }
  })

}

rabbitGet()