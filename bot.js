const Discord = require('discord.js');
const client = new Discord.Client();
const ayarlar = require('./ayarlar.json');
const chalk = require('chalk');
const moment = require('moment');
var Jimp = require('jimp');
const { Client, Util } = require('discord.js');
const weather = require('weather-js')
const fs = require('fs');
const db = require('quick.db');
const http = require('http');
const express = require('express');
require('./util/eventLoader')(client);
const path = require('path');
const request = require('request');
const snekfetch = require('snekfetch');
const { GOOGLE_API_KEY } = require('./ayarlar.json');
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(GOOGLE_API_KEY);
const queue = new Map();  
const ytdl = require('ytdl-core');


const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping tamamdır.");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

var prefix = ayarlar.prefix;

const log = message => {
    console.log(`${message}`);
};

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
    if (err) console.error(err);
    log(`${files.length} komut yüklenecek.`);
    files.forEach(f => {
        let props = require(`./komutlar/${f}`);
        log(`Yüklenen komut: ${props.help.name}.`);
        client.commands.set(props.help.name, props);
        props.conf.aliases.forEach(alias => {
            client.aliases.set(alias, props.help.name);
        });
    });
});




client.reload = command => {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./komutlar/${command}`)];
            let cmd = require(`./komutlar/${command}`);
            client.commands.delete(command);
            client.aliases.forEach((cmd, alias) => {
                if (cmd === command) client.aliases.delete(alias);
            });
            client.commands.set(command, cmd);
            cmd.conf.aliases.forEach(alias => {
                client.aliases.set(alias, cmd.help.name);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

client.load = command => {
    return new Promise((resolve, reject) => {
        try {
            let cmd = require(`./komutlar/${command}`);
            client.commands.set(command, cmd);
            cmd.conf.aliases.forEach(alias => {
                client.aliases.set(alias, cmd.help.name);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};




client.unload = command => {
    return new Promise((resolve, reject) => {
        try {
            delete require.cache[require.resolve(`./komutlar/${command}`)];
            let cmd = require(`./komutlar/${command}`);
            client.commands.delete(command);
            client.aliases.forEach((cmd, alias) => {
                if (cmd === command) client.aliases.delete(alias);
            });
            resolve();
        } catch (e) {
            reject(e);
        }
    });
};

client.on('message', msg => {
  if (msg.content.toLowerCase() === 'sa') {
    msg.reply('Aleyküm selam hoş geldin');
  }
});

client.elevation = message => {
    if (!message.guild) {
        return;
    }
    let permlvl = 0;
    if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
    if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
    if (message.author.id === ayarlar.sahip) permlvl = 4;
    return permlvl;
};

var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
// client.on('debug', e => {
//   console.log(chalk.bgBlue.green(e.replace(regToken, 'that was redacted')));
// });

client.on('warn', e => {
    console.log(chalk.bgYellow(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
    console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

client.on('message', async msg => {

	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(prefix)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);
	let command = msg.content.toLowerCase().split(' ')[0];
	command = command.slice(prefix.length)

	if (command === 'çal') {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
      .setColor('RED')
    .setDescription(':warning: | İlk olarak sesli bir kanala giriş yapmanız gerek.'));
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RED')
    .setTitle(':warning: | İlk olarak sesli bir kanala giriş yapmanız gerek.'));
		}
		if (!permissions.has('SPEAK')) {
			 return msg.channel.sendEmbed(new Discord.RichEmbed()
      .setColor('RED')
      .setTitle(':warning: | Şarkı başlatılamıyor. Lütfen mikrofonumu açınız.'));
        }

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
		for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			 return msg.channel.sendEmbed(new Discord.RichEmbed)
      .setTitle(`**? | Oynatma Listesi: **${playlist.title}** Kuyruğa Eklendi!**`)
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					let index = 0;
          
				 msg.channel.sendEmbed(new Discord.RichEmbed()                  
         .setTitle('Mxir`S | Şarkı Seçimi')
         .setAuthor(`${msg.author.tag}`, msg.author.avatarURL)
         .setThumbnail("https://i.postimg.cc/W1b1LW13/youtube-kids-new-logo.png")
         .setDescription(`${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}`)
         .setFooter('Lütfen 1-10 arasında bir rakam seçiniz 10 saniye içinde liste iptal edilecektir.')
         .setColor('RED'));
          msg.delete(5000)
         
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						 return msg.channel.sendEmbed(new Discord.RichEmbed()
            .setColor('RED')
            .setDescription(':warning: | **Şarkı Değeri Belirtmediğiniz İçin Seçim İptal Edilmiştir**.'));
                    }
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.sendEmbed(new Discord.RichEmbed()
          .setColor('RED')
          .setDescription(':( | **Aradım Fakat Hiç Bir Sonuç Çıkmadı**'));
                }
            }
			return handleVideo(video, msg, voiceChannel);
      
		}
	} else if (command === 'geç') {
		if (!msg.member.voiceChannel) if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RED')
    .setDescription(':x: | **Lütfen öncelikle sesli bir kanala katılınız**.'));
		if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
     .setColor('RED')
     .setTitle(':x: | **Hiç Bir Müzik Çalmamakta**'));                                              
		serverQueue.connection.dispatcher.end('**Müziği Geçildi!**');
		return undefined;
	} else if (command === 'durdur') {
		if (!msg.member.voiceChannel) if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RED')
    .setDescription('**:warning: | Lütfen öncelikle sesli bir kanala katılınız.**'));
		if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
     .setColor('RED')
     .setTitle(':warning: **| Hiç Bir Müzik Çalmamakta**'));                                              
		msg.channel.send(`:stop_button: **${serverQueue.songs[0].title}** Adlı Müzik Durduruldu`);
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('**Müzik Bitti**');
		return undefined;
	} else if (command === 'ses') {
		if (!msg.member.voiceChannel) if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RED')
    .setDescription(':warning: **| Lütfen öncelikle sesli bir kanala katılınız.**'));
		if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
     .setColor('RED')
     .setTitle(':warning:| **Hiç Bir Müzik Çalmamakta**'));                                              
		if (!args[1]) return msg.channel.sendEmbed(new Discord.RichEmbed()
   .setTitle(`:warning: Şuanki Ses Seviyesi: **${serverQueue.volume}**`)
    .setColor('BLUE'))
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(`:hammer:  Ses Seviyesi Ayarlanıyor: **${args[1]}**`)
    .setColor('GREEN'));                             
	} else if (command === 'çalan') {
		if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(":warning: | **Çalan Müzik Bulunmamakta**")
    .setColor('RED'));
		return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RED')
    .setTitle("Mxir`s | Çalan")                            
    .addField('Başlık', `[${serverQueue.songs[0].title}](${serverQueue.songs[0].url})`, true)
    .addField("Süre", `${serverQueue.songs[0].durationm}:${serverQueue.songs[0].durations}`, true))
	} else if (command === 'kuyruk') {
    let index = 0;
		if (!serverQueue) return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(":warning: | **Sırada Müzik Bulunmamakta**")
    .setColor('RED'));
		  return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setColor('RANDOM')
     .setTitle('Mxir`S| Şarkı Kuyruğu')
    .setDescription(`${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}`))
    .addField('Şu anda çalınan: ' + `${serverQueue.songs[0].title}`);
	} else if (command === 'duraklat') {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.sendEmbed(new Discord.RichEmbed()
      .setTitle("**:pause_button: Müzik Senin İçin Durduruldu!**")
      .setColor('GREEN'));
		}
		return msg.channel.send(':warning: | **Çalan Müzik Bulunmamakta**');
	} else if (command === 'devam') {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.sendEmbed(new Discord.RichEmbed()
      .setTitle("**:arrow_forward: Müzik Senin İçin Devam Etmekte!**")
      .setColor('GREEN'));
		}
		return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(":warning: ** | Çalan Müzik Bulunmamakta.**")
    .setColor('RED'));
	}
  

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
    const serverQueue = queue.get(msg.guild.id);
    const song = {
        id: video.id,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`,
    durationh: video.duration.hours,
    durationm: video.duration.minutes,
        durations: video.duration.seconds,
      zg: video.raw.snippet.channelId,
      best: video.channel.title,
      views: video.raw.views,
    };
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`:warning: **Şarkı Sisteminde Problem Var Hata Nedeni: ${error}**`);
			queue.delete(msg.guild.id);
			return msg.channel.sendEmbed(new Discord.RichEmbed()
      .setTitle(`:warning: **Şarkı Sisteminde Problem Var Hata Nedeni: ${error}**`)
      .setColor('RED'))
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(`:arrow_heading_up:  **${song.title}** Adlı Müzik Kuyruğa Eklendi!`)
    .setColor('GREEN'))
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === ' :x:  | **Yayın Akış Hızı Yeterli Değil.**') console.log('Müzik Bitti.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	 serverQueue.textChannel.sendEmbed(new Discord.RichEmbed()                                   
  .setTitle("**Mxir`S | :microphone: Müzik Başladı**")
  .setThumbnail(`https://i.ytimg.com/vi/${song.id}/default.jpg`)
  .addField('\nBaşlık', `[${song.title}](${song.url})`, true)
  .addField("\nSes Seviyesi", `${serverQueue.volume}%`, true)
  .addField("Süre", `${song.durationm}:${song.durations}`, true)
  .addField("Video ID", `${song.id}`, true)
  .addField("Kanal ID", `${song.zg}`, true)
  .addField("Kanal İsmi", `${song.best}`, true)
  .addField("Video Linki", `${song.url}`, true)                              
  .setImage(`https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`)
  .setColor('RED'));
}

client.on('message', async message => {
  const ms = require('ms');
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  let u = message.mentions.users.first() || message.author;
  if (command === "sunucu-kur") {
  if (message.guild.channels.find(channel => channel.name === "Bot Kullanımı")) return message.channel.send(" Bot Paneli Zaten Ayarlanmış.")
  message.channel.send(`Bot Bilgi Kanallarının kurulumu başlatılsın mı? başlatılacak ise **evet** yazınız.`)
      if (!message.member.hasPermission('ADMINISTRATOR'))
  return message.channel.send(" Bu Kodu `Yönetici` Yetkisi Olan Kişi Kullanabilir.");
      message.channel.awaitMessages(response => response.content === 'evet', {
        max: 1,
        time: 10000,
        errors: ['time'],
      })
    .then((collected) => {
   message.guild.createChannel('|▬▬|ÖNEMLİ KANALLAR|▬▬|', 'category', [{
  id: message.guild.id,
  deny: ['SEND_MESSAGES']
}])



        
 message.guild.createChannel('「📃」kurallar', 'text', [{
  id: message.guild.id,
  deny: ['SEND_MESSAGES']
}])
.then(channel =>
 channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|ÖNEMLİ KANALLAR|▬▬|")));
 message.guild.createChannel('「🚪」gelen-giden', 'text', [{
  id: message.guild.id,
  deny: ['SEND_MESSAGES']
}])
.then(channel =>
       channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|ÖNEMLİ KANALLAR|▬▬|")));
       message.guild.createChannel('「✅」sayaç', 'text', [{
        id: message.guild.id,
        deny: ['SEND_MESSAGES']
      }])
.then(channel =>
             channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|ÖNEMLİ KANALLAR|▬▬|")));
             message.guild.createChannel('「💾」log-kanalı', 'text', [{
              id: message.guild.id,
              deny: ['SEND_MESSAGES']
            }])
            .then(channel => channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|ÖNEMLİ KANALLAR|▬▬|")));
            message.guild.createChannel('「📢」duyuru-odası', 'text', [{
              id: message.guild.id,
              deny: ['SEND_MESSAGES']
            }])
.then(channel =>
 channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|ÖNEMLİ KANALLAR|▬▬|")));

       }) 
       .then((collected) => {
        message.guild.createChannel('|▬▬|GENEL KANALLAR|▬▬|', 'category', [{
       id: message.guild.id,
     }]);
             
      message.guild.createChannel(`「💡」şikayet-ve-öneri`, 'text')
     .then(channel =>
      channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|GENEL KANALLAR|▬▬|")));
     message.guild.createChannel(`「👥」pre-arama-odası`, 'text')
     .then(channel =>
            channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|GENEL KANALLAR|▬▬|")));
     message.guild.createChannel(`「📷」görsel-içerik`, 'text')
     .then(channel =>
                  channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|GENEL KANALLAR|▬▬|")));
     message.guild.createChannel(`「🤖」bot-komutları`, 'text')
     .then(channel =>
                  channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|GENEL KANALLAR|▬▬|")));
     message.guild.createChannel(`「💬」sohbet`, 'text')
     .then(channel =>
      channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|GENEL KANALLAR|▬▬|")));

      message.guild.createChannel(`🏆》Kurucu Odası`, "voice")
      .then(channel =>
        channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|SES KANALLARI|▬▬|")))
      .then(c => {
        let role = message.guild.roles.find("name", "@everyone");
        let role2 = message.guild.roles.find("name", "Kurucu");
        
        c.overwritePermissions(role, {
            CONNECT: false,
        });
        c.overwritePermissions(role2, {
            CONNECT: true,
            
        });
    })

    message.guild.createChannel('|▬▬|SES KANALLARI|▬▬|', 'category', [{
      id: message.guild.id,
    }]);

    message.guild.createChannel(`🏆》Yönetici Odası`, "voice")
    .then(channel =>
      channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|SES KANALLARI|▬▬|")))
    .then(c => {
      let role = message.guild.roles.find("name", "@everyone");
      let role2 = message.guild.roles.find("name", "Kurucu");
      let role3 = message.guild.roles.find("name", "Yönetici");
      c.overwritePermissions(role, {
          CONNECT: false,
      });
      c.overwritePermissions(role2, {
          CONNECT: true,
      });
      c.overwritePermissions(role3, {
          CONNECT: true,
      });
  })

  message.guild.createChannel(`💬》Sohbet Odası`, "voice")
  .then(channel =>
    channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|SES KANALLARI|▬▬|")))
  .then(c => {
    let role = message.guild.roles.find("name", "@everyone");
    c.overwritePermissions(role, {
        CONNECT: true,
    });
})

message.guild.createChannel('|▬▬|OYUN ODALARI|▬▬|', 'category', [{
  id: message.guild.id,
}]);

message.guild.createChannel(`🎮》LOL`, 'voice')
.then(channel =>
 channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
 message.guild.createChannel(`🎮》ZULA`, 'voice')
 .then(channel =>
  channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
 message.guild.createChannel(`🎮》COUNTER STRİKE`, 'voice')
.then(channel =>
 channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
 message.guild.createChannel(`🎮》PUBG`, 'voice')
 .then(channel =>
  channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
  message.guild.createChannel(`🎮》FORTNİTE`, 'voice')
  .then(channel =>
   channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
   message.guild.createChannel(`🎮》MİNECRAFT`, 'voice')
   .then(channel =>
    channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
    message.guild.createChannel(`🎮》ROBLOX`, 'voice')
    .then(channel =>
     channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))
     message.guild.createChannel(`🎮》WOLFTEAM`, 'voice')
     .then(channel =>
      channel.setParent(message.guild.channels.find(channel => channel.name === "|▬▬|OYUN ODALARI|▬▬|")))



      message.guild.createRole({
        name: 'Kurucu',
        color: 'RED',
        permissions: [
            "ADMINISTRATOR",
    ]
      })

      
      message.guild.createRole({
        name: 'Yönetici',
        color: 'BLUE',
        permissions: [
            "MANAGE_GUILD",
            "MANAGE_ROLES",
            "MUTE_MEMBERS",
            "DEAFEN_MEMBERS",
            "MANAGE_MESSAGES",
            "MANAGE_NICKNAMES",
            "KICK_MEMBERS"
    ]
      })

      message.guild.createRole({
        name: 'Moderatör',
        color: 'GREEN',
        permissions: [
            "MANAGE_GUILD",
            "MANAGE_ROLES",
            "MUTE_MEMBERS",
            "DEAFEN_MEMBERS",
            "MANAGE_MESSAGES",
            "MANAGE_NICKNAMES"
    ]
      })

      message.guild.createRole({
        name: 'V.I.P',
        color: '00ffff',
      })

      message.guild.createRole({
        name: 'Üye',
        color: 'WHITE',
      })

      message.guild.createRole({
        name: 'Bot',
        color: 'ORANGE',
      })

       message.channel.send("Gerekli Odalar Kuruldu!")
     
            })   
    
}
});

client.on('guildBanAdd', async (guild, member) => {
    const fs = require('fs');
let gc = JSON.parse(fs.readFileSync("./log.json", "utf8"));
  
  const hgK = member.guild.channels.get(gc[member.guild.id].gkanal)
    if (!hgK) return;
   const embed = new Discord.RichEmbed()
			.setTitle('Üye yasaklandı.')
			.setAuthor(member.user.tag, member.user.avatarURL)
			.setColor('RANDOM')
			.setDescription(`<@!${member.user.id}>, ${member.user.tag}`)
			.setThumbnail(member.user.avatarURL)
			.setFooter(`XiR Log Sistemi | ID: ${member.user.id}`)
			.setTimestamp();
			hgK.send({embed});

		
	})
	
client.on('guildBanRemove', async (guild, member) => {
		    const fs = require('fs');
let gc = JSON.parse(fs.readFileSync("./log.json", "utf8"));
  
  const hgK = member.guild.channels.get(gc[member.guild.id].gkanal)
    if (!hgK) return;
			var embed = new Discord.RichEmbed()
			.setTitle('Üyenin yasaklaması kaldırıldı.')
			.setAuthor(member.user.tag, member.user.avatarURL)
			.setColor('RANDOM')
			.setDescription(`<@!${member.user.id}>, ${member.user.tag}`)
			.setThumbnail(member.user.avatarURL)
			.setFooter(`XiR Log Sistemi | ID: ${member.user.id}`)
			.setTimestamp();
			hgK.send({embed});
		
	})
	
client.on('messageDelete', async msg => {
		if (!msg.guild) return;
    const fs = require('fs');
let gc = JSON.parse(fs.readFileSync("./log.json", "utf8"));
  
  const hgK = msg.guild.channels.get(gc[msg.guild.id].gkanal)
    if (!hgK) return;
			var embed = new Discord.RichEmbed()
			.setAuthor(msg.author.tag, msg.author.avatarURL)
			.setColor('RANDOM')
			.setDescription(`<@!${msg.author.id}> tarafından <#${msg.channel.id}> kanalına gönderilen "${msg.content}" mesajı silindi.`)
			.setFooter(`XiR Log Sistemi | ID: ${msg.id}`)
			hgK.send({embed});
		
	})

client.on('channelCreate', async channel => {
		if (!channel.guild) return;
    const fs = require('fs');
let gc = JSON.parse(fs.readFileSync("./log.json", "utf8"));
  
  const hgK = channel.guild.channels.get(gc[channel.guild.id].gkanal)
    if (!hgK) return;
		
			if (channel.type === "text") {
				var embed = new Discord.RichEmbed()
				.setColor('RANDOM')
				.setAuthor(channel.guild.name, channel.guild.iconURL)
				.setDescription(`<#${channel.id}> kanalı oluşturuldu. _(metin kanalı)_`)
				.setFooter(`XiR Log Sistemi | ID: ${channel.id}`)
				hgK.send({embed});
			};
			if (channel.type === "voice") {
				var embed = new Discord.RichEmbed()
					.setColor('RANDOM')
				.setAuthor(channel.guild.name, channel.guild.iconURL)
				.setDescription(`${channel.name} kanalı oluşturuldu. _(sesli kanal)_`)
				.setFooter(`XiR Log Sistemi | ID: ${channel.id}`)
				hgK.send({embed});
			}
		
	})

client.on("guildMemberAdd", async member => {
        let sayac = JSON.parse(fs.readFileSync("./autorole.json", "utf8"));
  let otorole =  JSON.parse(fs.readFileSync("./autorole.json", "utf8"));
      let arole = otorole[member.guild.id].sayi
  let giriscikis = JSON.parse(fs.readFileSync("./autorole.json", "utf8"));  
  let embed = new Discord.RichEmbed()
    .setTitle('Otorol Sistemi')
    .setDescription(`:loudspeaker: :inbox_tray:  @${member.user.tag}'a Otorol Verildi `)
.setColor("GREEN")
    .setFooter("XiR", client.user.avatarURL);

  if (!giriscikis[member.guild.id].kanal) {
    return;
  }

  try {
    let giriscikiskanalID = giriscikis[member.guild.id].kanal;
    let giriscikiskanali = client.guilds.get(member.guild.id).channels.get(giriscikiskanalID);
    giriscikiskanali.send(`:loudspeaker: :white_check_mark: Hoşgeldin **${member.user.tag}** Rolün Başarıyla Verildi.`);
  } catch (e) { // eğer hata olursa bu hatayı öğrenmek için hatayı konsola gönderelim.
    return console.log(e)
  }

});
//Kullanıcı sunucudan ayrıldığında ayarlanan kanala mesaj gönderelim.
client.on("guildMemberAdd", async (member) => {
      let autorole =  JSON.parse(fs.readFileSync("./autorole.json", "utf8"));
      let role = autorole[member.guild.id].sayi

      member.addRole(role)




});

let points = JSON.parse(fs.readFileSync('./level.json', 'utf8'));

var f = [];
function factorial (n) {
  if (n == 0 || n == 1 || n == 2)
    return 1;
  if (f[n] > 0)
    return f[n];
  return f[n] = factorial(n-1) * n;
};
function clean(text) {
  if (typeof(text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
      return text;
}

client.on("message", async message => {
    if (message.channel.type === "dm") return;

  if (message.author.bot) return;

  var user = message.mentions.users.first() || message.author;
  if (!message.guild) user = message.author;

  if (!points[user.id]) points[user.id] = {
    points: 0,
    level: 0,
  };

  let userData = points[user.id];
  userData.points++;

  let curLevel = Math.floor(0.1 * Math.sqrt(userData.points));
  if (curLevel > userData.level) {
    userData.level = curLevel;
        var user = message.mentions.users.first() || message.author;
				const bg = await Jimp.read("https://cdn.discordapp.com/attachments/458732340491845633/473603413243068437/fs.png");
				const userimg = await Jimp.read(user.avatarURL);
				var font;
				if (user.tag.length < 15) font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
				else if (user.tag.length > 15) font = await Jimp.loadFont(Jimp.FONT_SANS_632_BLACK);
				else font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
				var font2;
				if (user.tag.length < 15) font2 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
				else if (user.tag.length > 15) font2 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
				else font2 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
				await bg.print(font2, 17, 50, `LEVEL`);
				await bg.print(font, 27, 70, `${userData.level}`);
				await userimg.resize(35, 35);
				await (!userimg.resize(35, 35));
        await bg.composite(userimg, 25, 15).write("./img/level/" + client.user.id + "-" + user.id + ".png");
				  setTimeout(function () {
message.channel.send(`:up: **| ${user.username} level atladı!**`)
						message.channel.send(new Discord.Attachment("./img/level/" + client.user.id + "-" + user.id + ".png"));
				  }, 1000);
				  setTimeout(function () {
					fs.unlink("./img/level/" + client.user.id + "-" + user.id + ".png");
				  }, 10000);
    }
fs.writeFile('./level.json', JSON.stringify(points), (err) => {
    if (err) console.error(err)
});
    if (message.author.bot) return;
    if (message.author.id === client.user.id) return;
    if (message.content.indexOf(ayarlar.prefix) !== 0) return;
    const args = message.content.substring(ayarlar.prefix.length).split(" ");
    const command = args.shift().toLowerCase();
     if (command === 'profil' || command === 'level') {
      message.channel.startTyping()
        var user = message.mentions.users.first() || message.author;
        let memberID = await db.fetch(`memberID_${user.id}`);
        if (memberID == null) memberID = 'Aciklama mesaji ayarlanmamis.'
        let membername = await db.fetch(`membername_${user.id}`);
        if (membername == null) membername = `${user.tag}`
        let memberBadge = await db.fetch(`memberBadge_${user.id}`);
        if (memberBadge == null) memberBadge = `https://cdn.discordapp.com/attachments/461622592688619520/472923575049781268/profile.png`
        let memberBadge4 = await db.fetch(`memberBadge4_${user.id}`);
        if (memberBadge4 == null) memberBadge4 = `https://cdn.discordapp.com/attachments/461622592688619520/472923575049781268/profile.png`
				const bg = await Jimp.read("https://cdn.pbrd.co/images/HV2wJao.jpg");
				const userimg = await Jimp.read(user.avatarURL);
				const onay = await Jimp.read(`${memberBadge}`);
				const mod = await Jimp.read(`${memberBadge4}`);
				var font;
				if (membername.length < 12) font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else if (membername.length > 12) font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHİTE);
				var font2;
				if (user.tag.length < 15) font2 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else if (user.tag.length > 15) font2 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else font2 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				var font3;
				if (user.tag.length < 34) font3 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else if (user.tag.length > 34) font3 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
				else font3 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				var font4;
				if (user.tag.length < 15) font4 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else if (user.tag.length > 15) font4 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				else font4 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
				await bg.print(font, 270, 70, `${membername}`);
				await bg.print(font4, 40, 300, `Level: ${userData.level}`);
				await bg.print(font2, 40, 340, `GP: ${userData.points}`);
				await bg.print(font3, 40, 380, `Aciklama: ${memberID}`);
				await userimg.resize(200, 200);
				await (!userimg.resize(210, 210));
				await onay.resize(32, 32);
				await mod.resize(32, 32);
        await bg.composite(onay, 270, 120).write("./img/onay/" + client.user.id + "-" + user.id + ".png");
        await bg.composite(mod, 390, 120).write("./img/mod/" + client.user.id + "-" + user.id + ".png");
        await bg.composite(userimg, 40, 40).write("./img/userimg/" + client.user.id + "-" + user.id + ".png");
				  setTimeout(function () {  
message.channel.send(`:pencil: **| ${user.username} adlı kullanıcının profil kartı**`)
						message.channel.send(new Discord.Attachment("./img/userimg/" + client.user.id + "-" + user.id + ".png"));
				  }, 1000);
				  setTimeout(function () {
					fs.unlink("./img/userimg/" + client.user.id + "-" + user.id + ".png");
				  }, 10000);
      message.channel.stopTyping()
    }
  if (command === "açıklamaayarla" || command === "açıklama") {
        if (args.join(' ').length > 35) return message.channel.send(`${process.env.basarisiz} En fazla 35 karakter girebilirsiniz.`)
        if (!args.join(" ") && args.join(" ").toLowerCase() === `none`)
            return message.channel.send(`Uyarı: Geçerli bir yazı yazmalısın.\nDoğru kullanım: ${ayarlar.prefix}biyografi XiR candır.`)
        let newMessage;
        if (args.join(" ").toLowerCase() === `none`) newMessage = '';
        else newMessage = args.join(" ").trim();
        db.set(`memberID_${message.author.id}`, newMessage).then(i => {
            return message.channel.send(`**Yeni biyografin ayarlandı.**`)
        })
    }
});

client.on('message', message => {
     if(!message.channel.guild) return;
                if(message.content.startsWith(prefix + 'bots')) {

    
    if (message.author.bot) return;
    let i = 1;
        const botssize = message.guild.members.filter(m=>m.user.bot).map(m=>`${i++} - <@${m.id}>`);
          const embed = new Discord.RichEmbed()
          .setAuthor(message.author.tag, message.author.avatarURL)
          .setDescription(`**Sunucudaki Botlar ${message.guild.members.filter(m=>m.user.bot).size} **
${botssize.join('\n')}`)
.setFooter(client.user.username, client.user.avatarURL)
.setTimestamp();
message.channel.send(embed)

}
});

client.on("message", async message => {
    let sayac = JSON.parse(fs.readFileSync("./ayarlar/sayaç.json", "utf8"));
    if(sayac[message.guild.id]) {
        if(sayac[message.guild.id].sayi <= message.guild.members.size) {
            const embed = new Discord.RichEmbed()
                .setDescription(`Tebrikler ${message.guild.name}! Başarıyla **${sayac[message.guild.id].sayi}** kullanıcıya ulaştık! Sayaç sıfırlandı!`)
                .setColor(ayarlar.renk)
                .setTimestamp()
            message.channel.send({embed})
            delete sayac[message.guild.id].sayi;
            delete sayac[message.guild.id];
            fs.writeFile("./ayarlar/sayaç.json", JSON.stringify(sayac), (err) => {
                console.log(err)
            })
        }
    }
})

client.on("guildMemberAdd", async member => {
    let sayac = JSON.parse(fs.readFileSync("./ayarlar/sayaç.json", "utf8"));
    const channel = member.guild.channels.find("name", "sayaç")
    channel.send(`**${member.user.tag}** Katıldı 😎 **${sayac[member.guild.id].sayi}** olmamıza son **${sayac[member.guild.id].sayi - member.guild.members.size}** üye kaldı!`)
})

client.on("guildMemberRemove", async member => {
    let sayac = JSON.parse(fs.readFileSync("./ayarlar/sayaç.json", "utf8"));
    const channel = member.guild.channels.find("name", "sayaç")
    channel.send(`**${member.user.tag}** Ayrıldı 🙁 **${sayac[member.guild.id].sayi}** olmamıza son **${sayac[member.guild.id].sayi - member.guild.members.size}** üye kaldı!`)
})
            
client.login(ayarlar.token);
