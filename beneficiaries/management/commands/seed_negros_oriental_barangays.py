"""
Seed all 25 LGUs (6 Cities + 19 Municipalities) and 557 barangays
of Negros Oriental.

Source: Philippine Statistics Authority (PSA) / PSGC, 2020 Census basis
via PhilAtlas.

Run: python manage.py seed_negros_oriental_barangays
"""
from django.core.management.base import BaseCommand
from beneficiaries.models import Barangay


# ---------------------------------------------------------------------------
# 1st Congressional District (Northern)
# ---------------------------------------------------------------------------
LGU_1ST = {
    "Canlaon City": [
        "Bayog", "Binalbagan", "Bucalan", "Budlasan", "Linothangan",
        "Lumapao", "Mabigo", "Malaiba", "Masulog", "Ninoy Aquino",
        "Panubigan", "Pula",
    ],
    "Guihulngan City": [
        "Bakid", "Balogo", "Banwaque", "Basak", "Binobohan", "Buenavista",
        "Bulado", "Calamba", "Calupa-an", "Hibaiyo", "Hilaitan", "Hinakpan",
        "Humayhumay", "Imelda", "Kagawasan", "Linantuyan", "Luz", "Mabunga",
        "Magsaysay", "Malusay", "Maniak", "Mckinley", "Nagsaha",
        "Padre Zamora", "Plagatasanon", "Planas", "Poblacion", "Sandayao",
        "Tacpao", "Tinayunan Beach", "Tinayunan Hill", "Trinidad", "Villegas",
    ],
    "Ayungon": [
        "Amdus", "Anibong", "Atabay", "Awa-an", "Ban-ban", "Calagcalag",
        "Candana-ay", "Carol-an", "Gomentoc", "Inacban", "Iniban",
        "Jandalamanon", "Kilaban", "Lamigan", "Maaslum", "Mabato",
        "Manogtong", "Nabhang", "Poblacion", "Tambo", "Tampocon I",
        "Tampocon II", "Tibyawan", "Tiguib",
    ],
    "Bindoy": [
        "Atotes", "Batangan", "Bulod", "Cabcaban", "Cabugan", "Camudlas",
        "Canluto", "Danao", "Danawan", "Domolog", "Malaga", "Manseje",
        "Matobato", "Nagcasunog", "Nalundan", "Pangalaycayan", "Penahan",
        "Poblacion", "Salong", "Tagaytay", "Tinaogan", "Tubod",
    ],
    "Jimalalud": [
        "Aglahug", "Agutayon", "Apanangon", "Bae", "Bala-as", "Bangcal",
        "Banog", "Buto", "Cabang", "Camandayon", "Cangharay", "Canlahao",
        "Dayoyo", "Eli", "Lacaon", "Mahanlud", "Malabago", "Mambaid",
        "Mongpong", "North Poblacion", "Owacan", "Pacuan", "Panglaya-an",
        "Polopantao", "Sampiniton", "South Poblacion", "Talamban", "Tamao",
    ],
    "La Libertad": [
        "Aniniaw", "Aya", "Bagtic", "Biga-a", "Busilak", "Cangabo",
        "Cantupa", "Elecia", "Eli", "Guihob", "Kansumandig", "Mambulod",
        "Mandapaton", "Manghulyawon", "Manluminsag", "Mapalasan",
        "Maragondong", "Martilo", "Nasungan", "Pacuan", "Pangca", "Pisong",
        "Pitogo", "Poblacion North", "Poblacion South", "San Jose",
        "Solongon", "Tala-on", "Talayong",
    ],
    "Manjuyod": [
        "Alangilanan", "Bagtic", "Balaas", "Bantolinao", "Bolisong",
        "Butong", "Campuyo", "Candabong", "Concepcion", "Dungo-an",
        "Kauswagan", "Lamogong", "Libjo", "Maaslum", "Mandalupang",
        "Panciao", "Poblacion", "Sac-sac", "Salvacion", "San Isidro",
        "San Jose", "Santa Monica", "Suba", "Sundo-an", "Tanglad", "Tubod",
        "Tupas",
    ],
    "Tayasan": [
        "Bacong", "Bago", "Banga", "Cabulotan", "Cambaye", "Dalaupon",
        "Guincalaban", "Ilaya-Tayasan", "Jilabangan", "Lag-it", "Linao",
        "Lutay", "Maglihe", "Magtuhao", "Matauta", "Matuog", "Numnum",
        "Palaslan", "Pinalubngan", "Pindahan", "Pinocawan", "Poblacion",
        "Santa Cruz", "Saying", "Suquib", "Tamao", "Tambulan", "Tanlad",
    ],
    "Vallehermoso": [
        "Bagawines", "Bairan", "Cabulihan", "Don Espiridion Villegas",
        "Guba", "Macapso", "Maglahos", "Malangsa", "Molobolo", "Pinocawan",
        "Poblacion", "Puan", "Tabon", "Tagbino", "Ulay",
    ],
}

# ---------------------------------------------------------------------------
# 2nd Congressional District (Central)
# ---------------------------------------------------------------------------
LGU_2ND = {
    "Bais City": [
        "Barangay I", "Barangay II", "Basak", "Binohon", "Cabanlutan",
        "Calasga-an", "Cambagahan", "Cambaguio", "Cambanjao", "Cambuilao",
        "Canlargo", "Capinahan", "Consolacion", "Dansulan", "Hangyad",
        "Katacgahan", "La Paz", "Lo-oc", "Lonoy", "Mabunao", "Manlipac",
        "Mansangaban", "Okiot", "Olympia", "Panala-an", "Panam-angan",
        "Rosario", "Sab-ahan", "San Isidro", "Tagpo", "Talungon", "Tamisu",
        "Tamogong", "Tangculogan", "Valencia",
    ],
    "Dumaguete City": [
        "Bagacay", "Bajumpandan", "Balugo", "Banilad", "Bantayan",
        "Batinguel", "Bunao", "Cadawinonan", "Calindagan", "Camanjac",
        "Candau-ay", "Cantil-e", "Daro", "Junob", "Looc", "Mangnao-Canal",
        "Motong", "Piapi", "Poblacion No. 1", "Poblacion No. 2",
        "Poblacion No. 3", "Poblacion No. 4", "Poblacion No. 5",
        "Poblacion No. 6", "Poblacion No. 7", "Poblacion No. 8",
        "Pulantubig", "Tabuctubig", "Taclobo", "Talay",
    ],
    "Tanjay City": [
        "Azagra", "Bahi-an", "Luca", "Manipis", "Novallas", "Obogon",
        "Pal-ew", "Poblacion I", "Poblacion II", "Poblacion III",
        "Poblacion IV", "Poblacion V", "Poblacion VI", "Poblacion VII",
        "Poblacion VIII", "Poblacion IX", "Polo", "San Isidro", "San Jose",
        "San Miguel", "Santa Cruz Nuevo", "Santa Cruz Viejo", "Santo Nino",
        "Tugas",
    ],
    "Amlan": [
        "Bio-os", "Jantianon", "Jugno", "Mag-abo", "Poblacion", "Silab",
        "Tambojangin", "Tandayag",
    ],
    "Mabinay": [
        "Abis", "Arebasore", "Bagtic", "Banban", "Barras", "Bato",
        "Bugnay", "Bulibulihan", "Bulwang", "Campanun-an", "Canggohob",
        "Cansal-ing", "Dagbasan", "Dahile", "Hagtu", "Himocdongon", "Inapoy",
        "Lamdas", "Lumbangan", "Luyang", "Manlingay", "Mayaposi",
        "Napasu-an", "New Namangka", "Old Namangka", "Pandanon",
        "Paniabonan", "Pantao", "Poblacion", "Samac", "Tadlong", "Tara",
    ],
    "Pamplona": [
        "Abante", "Balayong", "Banawe", "Calicanan", "Datagon", "Fatima",
        "Inawasan", "Magsusunog", "Malalangsi", "Mamburao", "Mangoto",
        "Poblacion", "San Isidro", "Santa Agueda", "Simborio", "Yupisan",
    ],
    "San Jose": [
        "Basak", "Basiao", "Cambaloctot", "Cancawas", "Janayjanay",
        "Jilocon", "Naiba", "Poblacion", "San Roque", "Santo Nino",
        "Senora Ascion", "Siapo", "Tampi", "Tapon Norte",
    ],
    "Sibulan": [
        "Agan-an", "Ajong", "Balugo", "Bolocboloc", "Calabnugan",
        "Cangmating", "Enrique Villanueva", "Looc", "Magatas",
        "Maningcao", "Maslog", "Poblacion", "San Antonio", "Tubigon",
        "Tubtubon",
    ],
}

# ---------------------------------------------------------------------------
# 3rd Congressional District (Southern)
# ---------------------------------------------------------------------------
LGU_3RD = {
    "Bayawan City": [
        "Ali-is", "Banaybanay", "Banga", "Boyco", "Bugay", "Cansumalig",
        "Dawis", "Kalamtukan", "Kalumboyan", "Malabugas", "Mandu-ao",
        "Maninihon", "Minaba", "Nangka", "Narra", "Pagatban", "Poblacion",
        "San Isidro", "San Jose", "San Miguel", "San Roque", "Suba",
        "Tabuan", "Tayawan", "Tinago", "Ubos", "Villareal", "Villasol",
    ],
    "Bacong": [
        "Balayagmanok", "Banilad", "Buntis", "Buntod", "Calangag",
        "Combado", "Doldol", "Isugan", "Liptong", "Lutao", "Magsuhot",
        "Malabago", "Mampas", "North Poblacion", "Sacsac", "San Miguel",
        "South Poblacion", "Sulodpan", "Timbanga", "Timbao", "Tubod",
        "West Poblacion",
    ],
    "Basay": [
        "Actin", "Bal-os", "Bongalonan", "Cabalayongan", "Cabatuanan",
        "Linantayan", "Maglinao", "Nagbo-alao", "Olandao", "Poblacion",
    ],
    "Dauin": [
        "Anahawan", "Apo Island", "Bagacay", "Baslay", "Batuhon Dacu",
        "Boloc-boloc", "Bulak", "Bunga", "Casile", "Libjo", "Lipayo",
        "Maayongtubig", "Mag-aso", "Magsaysay", "Malongcay Dacu",
        "Masaplod Norte", "Masaplod Sur", "Panubtuban", "Poblacion I",
        "Poblacion II", "Poblacion III", "Tugawe", "Tunga-tunga",
    ],
    "Santa Catalina": [
        "Alangilan", "Amio", "Buenavista", "Caigangan", "Caranoche",
        "Cawitan", "Fatima", "Kabulacan", "Mabuhay", "Manalongon",
        "Mansagomayon", "Milagrosa", "Nagbalaye", "Nagbinlod", "Obat",
        "Poblacion", "San Francisco", "San Jose", "San Miguel", "San Pedro",
        "Santo Rosario", "Talalak",
    ],
    "Siaton": [
        "Albiga", "Apoloy", "Bonawon", "Bonbonon", "Cabangahan", "Canaway",
        "Casala-an", "Caticugan", "Datag", "Giliga-on", "Inalad",
        "Malabuhan", "Maloh", "Mantiquil", "Mantuyop", "Napacao",
        "Poblacion I", "Poblacion II", "Poblacion III", "Poblacion IV",
        "Salag", "San Jose", "Sandulot", "Si-it", "Sumaliring", "Tayak",
    ],
    "Valencia": [
        "Apolong", "Balabag East", "Balabag West", "Balayagmanok", "Balili",
        "Balugo", "Bong-ao", "Bongbong", "Caidiocan", "Calayugan",
        "Cambucad", "Dobdob", "Jawa", "Liptong", "Lunga", "Malabo",
        "Malaunay", "Mampas", "North Poblacion", "Palinpinon", "Puhagan",
        "Pulangbato", "Sagbang", "South Poblacion",
    ],
    "Zamboanguita": [
        "Basac", "Calango", "Lotuban", "Malongcay Diot", "Maluay",
        "Mayabon", "Nabago", "Najandig", "Nasig-id", "Poblacion",
    ],
}

# Combine all districts
ALL_LGUS = {}
ALL_LGUS.update(LGU_1ST)
ALL_LGUS.update(LGU_2ND)
ALL_LGUS.update(LGU_3RD)


class Command(BaseCommand):
    help = "Seed all 25 LGUs and 557 barangays of Negros Oriental"

    def handle(self, *args, **options):
        self.stdout.write("")
        self.stdout.write("  Seeding Negros Oriental Barangays")
        self.stdout.write("  " + "=" * 55)
        self.stdout.write("")

        total_created = 0
        total_skipped = 0
        lgu_count = 0

        # Process each congressional district
        for district_label, lgu_data in [
            ("1st District (Northern)", LGU_1ST),
            ("2nd District (Central)", LGU_2ND),
            ("3rd District (Southern)", LGU_3RD),
        ]:
            self.stdout.write(f"  {district_label}")
            self.stdout.write("  " + "-" * 55)

            for lgu_name, barangays in lgu_data.items():
                created = 0
                skipped = 0
                for brgy_name in barangays:
                    _, was_created = Barangay.objects.get_or_create(
                        name=brgy_name,
                        city_municipality=lgu_name,
                    )
                    if was_created:
                        created += 1
                    else:
                        skipped += 1

                total_created += created
                total_skipped += skipped
                lgu_count += 1

                status = "NEW" if created > 0 else "EXISTS"
                self.stdout.write(
                    f"    [{status}] {lgu_name:<22} {len(barangays):>3} barangays "
                    f"({created} created, {skipped} existing)"
                )

            self.stdout.write("")

        # Summary
        self.stdout.write("  " + "=" * 55)
        self.stdout.write(f"  LGUs:       {lgu_count}")
        self.stdout.write(f"  Barangays:  {total_created} created, {total_skipped} existing")
        self.stdout.write(f"  Total DB:   {Barangay.objects.count()} barangays")
        self.stdout.write("  " + "=" * 55)

        # Breakdown by type
        cities = sum(1 for name in ALL_LGUS if "City" in name)
        municipalities = lgu_count - cities
        self.stdout.write("")
        self.stdout.write(f"  Cities:         {cities}")
        self.stdout.write(f"  Municipalities: {municipalities}")
        self.stdout.write("")
