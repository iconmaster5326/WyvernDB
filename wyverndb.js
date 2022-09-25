class SortOrder {
  constructor(key, direction) {
    this.key = key;
    this.direction = direction;
  }
}

class SearchEnv {
  constructor() {
    this.sorting = [];
    this.grouping = [];
    this.unique = "printings";
  }
  filter(cards, term) {
    return [...cards.filter((c) => term.match(this, c))];
  }
}

class SearchTerm {
  match(env, card) {
    throw "SearchTerm: match not implemented!";
  }
}

class Filter {
  constructor(...names) {
    this.names = names;
  }
  match(env, card, op, word) {
    throw "Filter: match not implemented!";
  }
}

class BasicFilter extends Filter {
  constructor(...names) {
    super(...names);
  }
  match(env, card, op, word) {
    var v = this.value(env, card);
    if (v === undefined) {
      return false;
    }
    if (typeof v === "string") {
      word = word.toLowerCase();
      v = v.toLowerCase();
    } else {
      word = Number.parseFloat(word);
    }
    switch (op) {
      case ":":
        if (typeof v === "string") {
          return v.includes(word);
        } else {
          return word == v;
        }
      case "=":
        return word == v;
      case "!=":
        return word != v;
      case ">":
        return word > v;
      case ">=":
        return word >= v;
      case "<":
        return word < v;
      case "<=":
        return word <= v;
      default:
        throw "BasicFilter: op " + op + " not implemented!";
    }
  }
  value(env, card) {
    throw "BasicFilter: value not implemented!";
  }
}

class FilterName extends BasicFilter {
  constructor() {
    super("n", "name");
  }
  value(env, card) {
    return card["name"];
  }
}

class FilterSet extends BasicFilter {
  constructor() {
    super("s", "set");
  }
  value(env, card) {
    return card["set"];
  }
}

class FilterRarity extends BasicFilter {
  constructor() {
    super("r", "rarity");
  }
  value(env, card) {
    return card["rarity"];
  }
}

const FILTERS = {};
[new FilterName(), new FilterSet(), new FilterRarity()].forEach((filter) => {
  filter.names.forEach((name) => {
    FILTERS[name] = filter;
  });
});

class BasicTerm extends SearchTerm {
  constructor(word) {
    super();
    this.word = word;
  }
  match(env, card) {
    return card["name"].toLowerCase().includes(this.word.toLowerCase());
  }
}

class NegTerm extends SearchTerm {
  constructor(term) {
    super();
    this.term = term;
  }
  match(env, card) {
    return !this.term.match(env, card);
  }
}

class FilterTerm extends SearchTerm {
  constructor(filter, op, word) {
    super();
    this.filter = filter;
    this.op = op;
    this.word = word;
  }
  match(env, card) {
    return this.filter.match(env, card, this.op, this.word);
  }
}

class OrTerm extends SearchTerm {
  constructor(term1, term2) {
    super();
    this.term1 = term1;
    this.term2 = term2;
  }
  match(env, card) {
    return this.term1.match(env, card) || this.term2.match(env, card);
  }
}

class GroupTerm extends SearchTerm {
  constructor(terms) {
    super();
    this.terms = [...terms];
  }
  match(env, card) {
    return this.terms.every((t) => t.match(env, card));
  }
}

function parseTerm(query) {
  var group = new GroupTerm([]);
  var groupStack = [group];
  var inString = false,
    negation = false,
    escape = false,
    inOr = false;
  var currentWord = "",
    filterName = "",
    filterOp = "";

  function completeWord() {
    if (currentWord === "") return;
    var term;
    if (filterOp === "") {
      term = new BasicTerm(currentWord);
    } else {
      term = new FilterTerm(FILTERS[filterName], filterOp, currentWord);
    }
    if (negation) {
      term = new NegTerm(term);
    }

    if (inOr) {
      group.terms.push(new OrTerm(group.terms.pop(), term));
    } else {
      group.terms.push(term);
    }

    negation = inOr = false;
    currentWord = filterName = filterOp = "";
  }

  [...query].forEach((c) => {
    if (escape) {
      currentWord += c;
      escape = false;
    } else if (inString) {
      switch (c) {
        case "\\":
          escape = true;
          break;
        case '"':
          inString = false;
          break;
        default:
          currentWord += c;
      }
    } else {
      switch (c) {
        case "(":
          completeWord();
          group = new GroupTerm([]);
          groupStack.push(group);
          break;
        case ")":
          var newGroup = groupStack.pop();
          group = groupStack[groupStack.length - 1];
          group.terms.push(newGroup);
          break;
        case "|":
          inOr = true;
          break;
        case "!":
          if (filterName === "" && currentWord === "") {
            negation = true;
            break;
          }
        case ":":
        case ">":
        case "<":
        case "=":
          if (filterName === "") {
            if (currentWord === "") {
              currentWord += c;
            } else {
              filterName = currentWord;
              currentWord = "";
              filterOp += c;
            }
          } else {
            if (currentWord === "") {
              filterOp += c;
            } else {
              currentWord += c;
            }
          }
          break;
        case '"':
          inString = true;
          break;
        case " ":
        case "\t":
        case "\n":
          completeWord();
          break;
        default:
          currentWord += c;
      }
    }
  });
  completeWord();
  return groupStack[0];
}

function rarityString(card) {
  return {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    promo: "Promotional",
  }[card["rarity"]];
}

function addSearchResult(element, card, onClick) {
  var cardDiv = document.createElement("a");
  cardDiv.setAttribute("class", "text-center border p-2 flex-fill w-25");
  if (onClick === undefined) {
    cardDiv.setAttribute("href", card["id"] + ".html");
  } else {
    cardDiv.setAttribute("href", "#");
    cardDiv.addEventListener("click", onClick);
  }

  var name = document.createElement("div");
  name.innerText =
    card["name"] +
    " (" +
    sets[card["set"]]["name"] +
    " #" +
    card["number"] +
    ")";
  cardDiv.appendChild(name);

  var img = document.createElement("img");
  img.setAttribute("src", card["image"].replace(BASE_URL, ""));
  img.setAttribute("height", 200);
  cardDiv.appendChild(img);

  element.appendChild(cardDiv);
  return cardDiv;
}

function sortTableFn(elemId) {
  return function (n, key) {
    var table,
      rows,
      switching,
      i,
      x,
      y,
      shouldSwitch,
      dir,
      switchcount = 0;
    table = document.getElementById(elemId);
    switching = true;
    dir = "asc";
    while (switching) {
      switching = false;
      rows = table.rows;
      for (i = 1; i < rows.length - 1; i++) {
        shouldSwitch = false;
        x = rows[i].getElementsByTagName("TD")[n];
        y = rows[i + 1].getElementsByTagName("TD")[n];
        if (dir == "asc") {
          if (key(x) > key(y)) {
            shouldSwitch = true;
            break;
          }
        } else if (dir == "desc") {
          if (key(x) < key(y)) {
            shouldSwitch = true;
            break;
          }
        }
      }
      if (shouldSwitch) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        switchcount++;
      } else {
        if (switchcount == 0 && dir == "asc") {
          dir = "desc";
          switching = true;
        }
      }
    }
  };
}

function sortTableKeyText(x) {
  return x.textContent.toLowerCase();
}

function sortTableKeyNumber(x) {
  return Number(x.textContent);
}

function sortTableKeyNumericInput(x) {
  return Number(x.getElementsByTagName("input")[0].value);
}

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Promotional"];

function sortTableKeyRarity(x) {
  return RARITY_ORDER.indexOf(x.textContent);
}

function exportTextToClipboard(text) {
  function onFail(reason) {
    console.error("Clipboard operation failure: " + reason);
    alert(
      "Could not paste to clipboard. Try switching to HTTPS instead of HTTP, or use 'Export to File' instead."
    );
  }

  try {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("Clipboard operation success!");
      })
      .catch(onFail);
  } catch (reason) {
    onFail(reason);
  }
}

function exportTextToFile(text, filename) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function importTextFromClipboard() {
  function onFail(reason) {
    console.error("Clipboard operation failure: " + reason);
    alert(
      "Could not read clipboard. Try switching to HTTPS instead of HTTP, or use 'Import from File' instead."
    );
    return undefined;
  }

  try {
    return navigator.clipboard
      .readText()
      .then((text) => importDecklist(text))
      .catch(onFail);
  } catch (reason) {
    return Promise.resolve(onFail(reason));
  }
}

function importTextFromFile() {
  return new Promise((resolve) => {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = "text/plain";

    input.onchange = () => {
      var reader = new FileReader();
      reader.readAsText(Array.from(input.files)[0], "UTF-8");
      reader.onload = (readerEvent) => {
        resolve(importDecklist(readerEvent.target.result));
      };
    };

    input.click();
  });
}

function exportDecklist(idToNumberMap) {
  result = "";
  var hoard = Object.keys(idToNumberMap).filter(
    (id) => cards[id]["type"] === "treasure" || cards[id]["type"] === "action"
  );
  var lair = Object.keys(idToNumberMap).filter(
    (id) => cards[id]["type"] === "dragon" || cards[id]["type"] === "terrain"
  );
  hoard.forEach((id) => {
    result += idToNumberMap[id] + "\t" + cards[id]["name"] + "\n";
  });
  result += "Dragon Lair:\n";
  lair.forEach((id) => {
    result += idToNumberMap[id] + "\t" + cards[id]["name"] + "\n";
  });
  return result;
}

function newestPrintingWithName(name) {
  return Object.values(cards)
    .filter((card) => card["name"] === name)
    .sort(
      (c1, c2) => -(sets[c1["set"]]["order"] - sets[c2["set"]]["order"])
    )[0];
}

function importDecklist(text) {
  var idToNumberMap = {};
  text.split(/\r?\n/).forEach((line) => {
    var cols = line.split("\t");
    if (cols.length != 2) {
      return;
    }

    var card = newestPrintingWithName(cols[1]);
    if (card === undefined) {
      console.warn("card not found: " + cols[1]);
      return;
    }

    if (card["id"] in idToNumberMap) {
      idToNumberMap[card["id"]] += cols[0];
    } else {
      idToNumberMap[card["id"]] = cols[0];
    }
  });
  return idToNumberMap;
}
