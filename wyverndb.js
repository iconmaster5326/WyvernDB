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
