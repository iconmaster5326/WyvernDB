import shutil
import jinja2
import os
import json

BASE_URL = "https://iconmaster.info/wyverndb/"

jinja_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader("."), autoescape=jinja2.select_autoescape()
)
card_template = jinja_env.get_template("card.jinja")
set_template = jinja_env.get_template("set.jinja")

os.makedirs("docs", exist_ok=True)

for file in ["wyverndb.js"]:
    shutil.copy2(file, os.path.join("docs", file))
for dir in ["data"]:
    shutil.copytree(dir, os.path.join("docs", dir), dirs_exist_ok=True)

cards = {}
CARDS_DIR = os.path.join("data", "cards")
for card in os.listdir(CARDS_DIR):
    with open(os.path.join(CARDS_DIR, card), "r") as input_json_file:
        card = json.load(input_json_file)
        cards[card["id"]] = card

sets = {}
SETS_DIR = os.path.join("data", "sets")
for set_ in os.listdir(SETS_DIR):
    with open(os.path.join(SETS_DIR, set_), "r") as input_json_file:
        set_ = json.load(input_json_file)
        sets[set_["id"]] = set_


def card_type_string(card):
    if card["type"] == "action":
        return {
            "action": "Action",
            "battle_action": "Battle Action",
            "reaction": "Reaction",
            "battle_reaction": "Battle Reaction",
            "slayer_action": "Dragon Slayer Action",
            "hidden_action": "Hidden Action",
            "intercept_action": "Intercept Action",
        }[card["subtype"]]
    else:
        return {
            "dragon": "Dragon",
            "terrain": "Terrain",
            "treasure": "Treasure",
        }[card["type"]]


def rarity_string(card):
    return {
        "common": "Common",
        "uncommon": "Uncommon",
        "rare": "Rare",
        "promo": "Promotional",
    }[card["rarity"]]


def ability_string(card, ability):
    return {
        "flying": "FLYING",
        "scout": "SCOUT",
        "super_flying": "SUPER FLYER",
        "subterranean": "SUBTERRANEAN",
    }[ability]


with open(os.path.join("docs", "data", "cards.json"), "w") as json_file:
    json.dump(list(cards.keys()), json_file)

with open(os.path.join("docs", "data", "sets.json"), "w") as json_file:
    json.dump(list(sets.keys()), json_file)

cards_by_name = {}
for card in cards.values():
    cards_by_name.setdefault(card["name"], [])
    cards_by_name[card["name"]].append(card["id"])

jinja_vars = dict(
    cards=cards,
    sets=sets,
    cards_by_name=cards_by_name,
    card_type_string=card_type_string,
    rarity_string=rarity_string,
    ability_string=ability_string,
    repr=repr,
    len=len,
    list=list,
    BASE_URL=BASE_URL,
)

for page in ["index", "search", "random", "syntax"]:
    with open(os.path.join("docs", page + ".html"), "w") as output_html_file:
        output_html_file.write(
            jinja_env.get_template(page + ".jinja").render(**jinja_vars)
        )

for card in cards.values():
    with open(os.path.join("docs", card["id"] + ".html"), "w") as output_html_file:
        output_html_file.write(
            card_template.render(card=card, set=sets[card["set"]], **jinja_vars)
        )

for set_ in sets.values():
    with open(os.path.join("docs", set_["id"] + ".html"), "w") as output_html_file:
        output_html_file.write(set_template.render(set=set_, **jinja_vars))
