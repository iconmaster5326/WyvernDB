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

with open(os.path.join("docs", "data", "cards.json"), "w") as json_file:
    json.dump(list(cards.keys()), json_file)

with open(os.path.join("docs", "data", "sets.json"), "w") as json_file:
    json.dump(list(sets.keys()), json_file)

cards_by_name = {}
for card in cards.values():
    cards_by_name.setdefault(card["name"], [])
    cards_by_name[card["name"]].append(card["id"])

for page in ["index", "search", "random"]:
    with open(os.path.join("docs", page + ".html"), "w") as output_html_file:
        output_html_file.write(
            jinja_env.get_template(page + ".jinja").render(
                cards=cards,
                sets=sets,
                cards_by_name=cards_by_name,
                repr=repr,
                len=len,
                list=list,
                BASE_URL=BASE_URL,
            )
        )

for card in cards.values():
    with open(os.path.join("docs", card["id"] + ".html"), "w") as output_html_file:
        output_html_file.write(
            card_template.render(
                card=card,
                set=sets[card["set"]],
                cards=cards,
                sets=sets,
                cards_by_name=cards_by_name,
                repr=repr,
                len=len,
                list=list,
                BASE_URL=BASE_URL,
            )
        )

for set_ in sets.values():
    with open(os.path.join("docs", set_["id"] + ".html"), "w") as output_html_file:
        output_html_file.write(
            set_template.render(
                set=set_,
                cards=cards,
                sets=sets,
                cards_by_name=cards_by_name,
                repr=repr,
                len=len,
                list=list,
                BASE_URL=BASE_URL,
            )
        )
