const dicUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const maxUncert = .3;

let localDic = { any: {} };

async function getWordInfo(word) {
    try {
        const response = await fetch(dicUrl + word.toLowerCase());
        return new Word((await response.json())[0]);
    } catch (error) {
        return new Word({ word: word });
    }
}



let patternLists = {
    greeting: [
        new Pattern(
            [
                { key: 'partOfSpeech', eq: ['exclamation', 'interjection'] },
                { key: 'def', has: ['greeting'] }
            ],
            .1
        ),
        new Pattern(
            [
                { key: 'def', has: ['greeting'] }
            ],
            .6
        )
    ],
    user: [new Pattern([{ key: 'word', eq: ['i', 'me', 'myself', 'my', 'mine'] }])],
    shitchat: [new Pattern([{ key: 'word', starts: ['you'], eq: ['thou', 'thee', 'thy', 'thyself', 'thine', 'ye'], has: ['shitchat', 'shit-chat'] }], .01)],
    bad: [new Pattern([{ key: 'word', has: ['fuck'] }])]
};

['noun', 'verb', 'adjective', 'interjection', 'exclamation'].forEach(
    (pos, i, poss) => patternLists[pos] = [
        new Pattern([{ key: 'partOfSpeech', eq: [pos] }], 0.1),
        new Pattern([{ key: 'partOfSpeech', eq: [poss.filter(p => p !== pos)] }], 4)
    ]
)

function match(wordData) {
    for (let key in patternLists) {
        const ps = patternLists[key]
        let uncert = ps.reduce((u, p) => u * p.check(wordData), 1);
        wordData.patterns[key] = uncert;
        if (uncert <= maxUncert) {
            localDic[key] ||= {};
            localDic[key][wordData.word] = wordData;
        }
    }
    return wordData;
}



function typeUncert(words, key) {
    return words.reduce((u, w) => u * w.patterns[key], 1);
}

function hasType(words, key) {
    return typeUncert(...arguments) <= maxUncert;
}

async function reply(msg) {
    let words = msg.toLowerCase().split(' ').map(async w => match(await (getWordInfo(w))));
    let rep = "";
    for (i in words) {
        words[i] = await words[i];
    }

    if (hasType(words, 'greeting')) {
        rep += 'Hi there! '
    }

    if (hasType(words, 'user')) {
        rep += 'That\'s you!'
    }

    if (hasType(words, 'shitchat')) {
        rep += 'That\'s me! '
        let start = 0;
        let lastI = words.length - 1;
        if (words[lastI].patterns.shitchat <= maxUncert) {
            rep += msg.split(' ').slice(0, lastI).join(' ') + ' you too! '
        }
    }

    if (words.some(w => w.patterns.bad <= maxUncert)) {
        rep += 'Fuck you!'
    }
    return rep || 'Sorry, I don\'t understand';
}