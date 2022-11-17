const confJson = require('../conf.json');
const amqplib = require('amqplib')


async function rabbit() {
	const queueName = "title"
	const connection = await amqplib.connect('amqp://localhost');
	const channel = await connection.createChannel();
	await channel.assertQueue(queueName);

	console.log("Waiting for messages in queue: ",queueName);
	channel.consume(queueName,msg=>{
		const title= msg.content.toString();
		for (const site of confJson){
			const base = site.id;
			const keyword = site.keyword;
			const page_keyword = site.page_keyword;
			const page_numbers = site.page_numbers;

			for (const Page_Number of page_numbers){
				const url = base + keyword + title + page_keyword + Page_Number.toString();
				const queueName2 = "url";

				const payload = new Object()
				payload.title = title
				payload.url = url
				payload.id = base
				let payloadAsString = JSON.stringify(payload);

				channel.sendToQueue(queueName2, Buffer.from(payloadAsString));
				console.log('Sent: ',payloadAsString);
			}
		}
	})
}

rabbit()