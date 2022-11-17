const puppeteer = require('puppeteer');
const confJson = require('../conf.json');
const amqplib = require('amqplib')

async function rabbitSend(msg) {
  const queueName = "job"
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);

  channel.sendToQueue(queueName, Buffer.from(msg));
  console.log('Sent: ',msg);
  setTimeout(()=>{
    connection.close();
  },0)
}



async function puppet(url,element,base,title){
  const payload = new Object()
  payload.title =title
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36");

  await page.goto("https://www."+url);
  await page.waitForSelector(element)
  const link_list = await page.$$(element)

  for(const link of link_list){
    const href = await page.evaluate(el=>el.getAttribute('href'),link)
    if (href.startsWith('//')){
      payload.job = "https://"+href.slice(2)
    }else{
      payload.job= "https://www."+base+href
    }
    let payloadAsString = JSON.stringify(payload);
    rabbitSend(payloadAsString)
  }

  await browser.close();
}



async function rabbitGet(){
  const queueName = "url"
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName);
  console.log("Waiting for messages in queue: ",queueName);
  channel.consume(queueName,async (msg)=>{
    let payload = JSON.parse(msg.content.toString())
    let title=payload.title
    let url = payload.url
    let id = payload.id
    for (const site of confJson){
      if (id==site.id){
        const element=site.list_jobs
        puppet(url,element,id,title)
      }
    }
  })

}


rabbitGet()