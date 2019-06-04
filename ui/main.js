// sum init
const urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

let messages = [];
let users = [];
document.querySelector('#info-status').innerText = 'Ładowanie...';

moment.locale('pl');
clear();
document.querySelector('.sum').style.display = 'flex';

fetch("/load")
.then(resp => resp.json())
.then(data => {
    let mode;

    // status
    //messages = data;
    if(data[0].lines[0] == "==============================================================") {
        document.querySelector('#info-warning').innerText = 'Uwaga! Plik zapisany w nowej wersji, która nie jest do końca wspierana. Niektóre wiadomości mogą się nie wyświetlać.'
        document.querySelector('.info').classList.add('info-warning');
        mode = 2;
        data.shift();
    } else {
        mode = 1;
    }

    let lastMessageAuthor;
    data.forEach((m, i) => {
        if(m.lines == null) return

        let author;
        let date;

        if(mode == 1) {
            let ad = m.lines[0].split("  ");

            author = ad[0];
            date = ad[1];
        } else if (mode == 2) {
            let ad = m.lines[0].split("] ")
            date = ad[0];
            author = ad[1];

            if(author) lastMessageAuthor = author;
            if(!author) author = lastMessageAuthor;
        }
        
        let uns = users.find(user => user.name == author)
        if(uns) {
            uns.messages++;
        } else {
            if(author.match(/#[0-9]{4}/g)) users.push({
                name: author,
                messages: 1
            })
        }

        let msg = m.lines.slice(1).join("\n")

        messages.push({
            author,
            date,
            msg
        })

        //if(author.includes("onioneq4")) console.log("o pizza")
    })
    document.querySelector('#info-status').innerText = 'Wczytano '+messages.length+' wiadomości.';
})

// KARTY

document.querySelector('.tab-search').addEventListener('click', () => {
    clear();
    document.querySelector('.search').style.display = 'block';
})

document.querySelector('.tab-users').addEventListener('click', () => {
    clear();
    usersInit();
    document.querySelector('.users').style.display = 'grid';
})

document.querySelector('.tab-all').addEventListener('click', () => {
    clear();

    let msgs = searchAll();
    showMessages(msgs, true);
})
document.querySelector('.top-button').addEventListener('click', clear)

document.querySelector('.search-btn').addEventListener('click', () => {
    let nick = document.querySelector('#s-nick').value;
    let cnick = document.querySelector('#c-nick').checked;

    let data = document.querySelector('#s-data').value;

    let tresc = document.querySelector('#s-tresc').value;
    let ctresc = document.querySelector('#c-tresc').checked;

    let msgs = search(nick, data, tresc, cnick, ctresc);
    showMessages(msgs, true);
})

// CZYSZCZENIE MAGAZNYÓW
function clear() {
    let reader = document.querySelector('.reader')

    while(reader.firstChild) {
        reader.removeChild(reader.firstChild)
    }

    document.querySelector('.view').style.display = 'none';
    document.querySelector('.menu').style.display = 'block';
    document.querySelector('.sum').style.display = 'none';
    //
    document.querySelector('.search').style.display = 'none';
    document.querySelector('.users').style.display = 'none';

    window.onscroll = () => null;
}

// funkcja wywoływania pokazywaczki wiadomości
function showMessages(results, paginate) {
    return new Promise(resolve => {
        document.querySelector('.menu').style.display = 'none';
        document.querySelector('.view').style.display = 'block';
        let reader = document.querySelector('.reader')
    
        while(reader.firstChild) {
            reader.removeChild(reader.firstChild)
        }
    
        document.querySelector('#results').innerText = results.length;
    
        if(paginate) {
    
            reader.lastSlice = -10;
    
            if(results.slice(-11, reader.lastSlice).length > 0) {
                document.querySelector('#results-r').innerText = 10;
            
                let btn = document.createElement('button');
                btn.innerText = 'wczytaj więcej wiadomości';
                btn.className = 'btn-more';
                btn.addEventListener('click', e => loadMore(e, reader, results));
                reader.insertBefore(btn, reader.firstChild);
            } else {
                document.querySelector('#results-r').innerText = results.length;
            }
    
            results.slice(-10).forEach(message => {
                reader.appendChild(insertMessage(message));
            })
            resolve();
        } else {
            document.querySelector('#results-r').innerText = results.length;
            
            results.forEach(message => {
                reader.appendChild(insertMessage(message));
            })
            resolve();
        }
    })
}

function insertMessage(message) {
    let messageNode = document.createElement('div');
    messageNode.className = 'message';
    
    let messageData = document.createElement('div');
    messageData.className = 'message-data';

    let messageAuthor = document.createElement('span');
    messageAuthor.className = 'message-author';
    messageAuthor.innerText = message.author;

    let messageDate = document.createElement('span');
    messageDate.className = 'message-date';
    messageDate.innerText = message.date;

    let messageContent = document.createElement('span');
    messageContent.className = 'message-content';
    
    let imgUrl = "";
    let videoUrl = "";

    let msg = message.msg.replace(urlRegex, url => {
        let urlObj = new URL(url);
        if(urlObj.host == 'cdn.discordapp.com') {
            imgUrl = urlObj.href;
        }
        if(urlObj.host == 'youtu.be') {
            videoUrl = urlObj.pathname;
        }
        if(urlObj.host == 'www.youtube.com' || urlObj.host == 'm.youtube.com') {
            if(urlObj.searchParams.get('v')) videoUrl = urlObj.searchParams.get('v');
        }
        return `<a href=${url} target="_blank">${url}</a>`
    })
    
    if(msg != message.msg) messageContent.innerHTML = msg;
    else messageContent.innerText = msg;
    
    messageDate.addEventListener('click', () => nearby(message.date, messageContent.innerText))

    messageData.appendChild(messageAuthor);
    messageData.appendChild(messageDate);
    
    messageNode.appendChild(messageData);
    messageNode.appendChild(messageContent);
    if(imgUrl.length > 0) {
        let imgNode = document.createElement("img");
        imgNode.src = imgUrl;
        imgNode.className = 'message-image';
        messageNode.appendChild(imgNode);
    }
    if(videoUrl.length > 0) {
        let videoNode = document.createElement("iframe");
        videoNode.src = 'https://youtube.com/embed/'+videoUrl;
        videoNode.frameBorder = 0;
        videoNode.className = 'message-video';
        messageNode.appendChild(videoNode);
    }

    return messageNode;
}

function loadMore(e, reader, results) {
    let lastScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    let newMsgs = results.slice(reader.lastSlice-10, reader.lastSlice)
    
    newMsgs.reverse().forEach(message => {
        reader.insertBefore(insertMessage(message), reader.firstChild);
    })

    let current = Number(document.querySelector('#results-r').innerText);
    document.querySelector('#results-r').innerText = current + newMsgs.length;

    e.target.remove();
    
    reader.lastSlice = reader.lastSlice-10;

    window.scrollTo({top: document.documentElement.scrollHeight - document.documentElement.clientHeight-lastScroll});

    if(results.slice(reader.lastSlice-1, reader.lastSlice).length > 0) {
        let btn = document.createElement('button');
        btn.innerText = 'wczytaj więcej wiadomości';
        btn.className = 'btn-more';
        btn.addEventListener('click', e => loadMore(e, reader, results))
        reader.insertBefore(btn, reader.firstChild);
    }

}

// funkcja szukajka
function search(nick, data, tresc, cnick, ctresc) {
    let results = [];

    messages.forEach(m => {
        let match = false;

        if(nick.length > 0) {
            if(cnick) {
                // uwzglednia wielkosc liter
                if(m.author.includes(nick)) match = true;
                else return;
            } else {
                // nie uwzglednia
                if((m.author.toLowerCase()).includes(nick.toLowerCase())) match = true;
                else return;
            }
        }

        if(data.length > 0) {
            if(!m.date) return;
            if(m.date.includes(data)) match = true;
            else return;
        }

        if(tresc.length > 0) {
            if(ctresc) {
                // uwzglednia wielkosc liter
                if(m.msg.includes(tresc)) match = true;
                else return;
            } else {
                if(m.msg.toLowerCase().includes(tresc.toLowerCase())) match = true;
                else return;
            }
        }

        if(match) {
            let pushObj = {
                author: m.author,
                date: moment(m.date.substr(1).slice(0, -1), "DD-MMM-YY hh:mm a").format("D.MM.YYYY o HH:mm"),
                msg: m.msg,
            }
            results.push(pushObj);
        }
        //if(author.includes("onioneq4")) console.log("o pizza")
    })

    return results;
}

function searchAll() {
    let results = [];

    messages.forEach(m => {
        if(!m.date) return;

        let pushObj = {
            author: m.author,
            date: moment(m.date.substr(1).slice(0, -1), "DD-MMM-YY hh:mm a").format("D.MM.YYYY o HH:mm"),
            msg: m.msg,
        }
        results.push(pushObj);
    })

    return results;
}

// wyszukiwanie POBLISKICH wiadomości
function nearby(centertel, dat) {
    let time = moment(centertel, 'D.MM.YYYY o HH:mm');
    let results = [];

    for (i = 0; i <= 30; i++) {
        let shift = moment(time, 'D.MM.YYYY o HH:mm').add(i-15, 'minutes').format('DD-MMM-YY hh:mm A');
        let msgs = search('', shift, '', false, false);

        results = results.concat(msgs)
    }

    showMessages(results, false).then(() => {
        let center = document.querySelectorAll('.message-content');
 
        center.forEach(el => {
            if(el.innerText == dat) {
                el.parentNode.style.background = '#3d414f'
                el.scrollIntoView({ block: 'center', behavior: "smooth"})
                return;
            }
        })
        
    })
    
    
}

// funkcja użytkownicy
function usersInit() {
    let ct = document.querySelector('.users');
    // clear
    while(ct.firstChild) {
        ct.removeChild(ct.firstChild)
    }

    let admins = ['_roofik_#2600', 'Dąb#5080', 'onioneq4#1175', 'mati82821#5949'];

    users.sort((a, b) => b.messages-a.messages).forEach(user => {
        let d = document.createElement('div');
        d.className = 'user'

        let name = document.createElement('div');
        let messages = document.createElement('div');

        name.innerText = user.name;
        messages.innerText = user.messages+' wiadomości';

        name.className = 'user-name';
        if(admins.indexOf(user.name) >= 0) name.classList.add('admin');

        messages.className = 'messages';

        d.appendChild(name);
        d.appendChild(messages);

        d.addEventListener('click', () => {
            window.scrollTo({ top: 0 })
            let msgs = search(user.name, '', '', false, false);
            showMessages(msgs, true);
        })

        ct.appendChild(d);
    })
}