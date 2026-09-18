// Funções e cotas conforme a aba Vagas da planilha base.
// NTE: uma vaga por NTE em cada função, somando os 27 de cada linha do painel.
// "setor": funções do mesmo setor viram uma opção única que abre a escolha da diretoria.
//          O nome gravado e exibido nos painéis é setor/nome, como SGINF/DIE.
// "limites": cota diferente por evento; "limite": mesma cota nos dois.
var CATALOGO_FUNCOES = [
  {
    "id": "nte-01-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 01",
    "limite": 1
  },
  {
    "id": "nte-01-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 01",
    "limite": 1
  },
  {
    "id": "nte-01-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 01",
    "limite": 1
  },
  {
    "id": "nte-02-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 02",
    "limite": 1
  },
  {
    "id": "nte-02-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 02",
    "limite": 1
  },
  {
    "id": "nte-02-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 02",
    "limite": 1
  },
  {
    "id": "nte-03-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 03",
    "limite": 1
  },
  {
    "id": "nte-03-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 03",
    "limite": 1
  },
  {
    "id": "nte-03-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 03",
    "limite": 1
  },
  {
    "id": "nte-04-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 04",
    "limite": 1
  },
  {
    "id": "nte-04-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 04",
    "limite": 1
  },
  {
    "id": "nte-04-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 04",
    "limite": 1
  },
  {
    "id": "nte-05-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 05",
    "limite": 1
  },
  {
    "id": "nte-05-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 05",
    "limite": 1
  },
  {
    "id": "nte-05-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 05",
    "limite": 1
  },
  {
    "id": "nte-06-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 06",
    "limite": 1
  },
  {
    "id": "nte-06-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 06",
    "limite": 1
  },
  {
    "id": "nte-06-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 06",
    "limite": 1
  },
  {
    "id": "nte-07-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 07",
    "limite": 1
  },
  {
    "id": "nte-07-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 07",
    "limite": 1
  },
  {
    "id": "nte-07-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 07",
    "limite": 1
  },
  {
    "id": "nte-08-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 08",
    "limite": 1
  },
  {
    "id": "nte-08-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 08",
    "limite": 1
  },
  {
    "id": "nte-08-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 08",
    "limite": 1
  },
  {
    "id": "nte-09-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 09",
    "limite": 1
  },
  {
    "id": "nte-09-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 09",
    "limite": 1
  },
  {
    "id": "nte-09-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 09",
    "limite": 1
  },
  {
    "id": "nte-10-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 10",
    "limite": 1
  },
  {
    "id": "nte-10-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 10",
    "limite": 1
  },
  {
    "id": "nte-10-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 10",
    "limite": 1
  },
  {
    "id": "nte-11-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 11",
    "limite": 1
  },
  {
    "id": "nte-11-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 11",
    "limite": 1
  },
  {
    "id": "nte-11-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 11",
    "limite": 1
  },
  {
    "id": "nte-12-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 12",
    "limite": 1
  },
  {
    "id": "nte-12-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 12",
    "limite": 1
  },
  {
    "id": "nte-12-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 12",
    "limite": 1
  },
  {
    "id": "nte-13-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 13",
    "limite": 1
  },
  {
    "id": "nte-13-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 13",
    "limite": 1
  },
  {
    "id": "nte-13-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 13",
    "limite": 1
  },
  {
    "id": "nte-14-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 14",
    "limite": 1
  },
  {
    "id": "nte-14-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 14",
    "limite": 1
  },
  {
    "id": "nte-14-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 14",
    "limite": 1
  },
  {
    "id": "nte-15-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 15",
    "limite": 1
  },
  {
    "id": "nte-15-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 15",
    "limite": 1
  },
  {
    "id": "nte-15-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 15",
    "limite": 1
  },
  {
    "id": "nte-16-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 16",
    "limite": 1
  },
  {
    "id": "nte-16-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 16",
    "limite": 1
  },
  {
    "id": "nte-16-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 16",
    "limite": 1
  },
  {
    "id": "nte-17-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 17",
    "limite": 1
  },
  {
    "id": "nte-17-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 17",
    "limite": 1
  },
  {
    "id": "nte-17-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 17",
    "limite": 1
  },
  {
    "id": "nte-18-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 18",
    "limite": 1
  },
  {
    "id": "nte-18-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 18",
    "limite": 1
  },
  {
    "id": "nte-18-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 18",
    "limite": 1
  },
  {
    "id": "nte-19-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 19",
    "limite": 1
  },
  {
    "id": "nte-19-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 19",
    "limite": 1
  },
  {
    "id": "nte-19-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 19",
    "limite": 1
  },
  {
    "id": "nte-20-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 20",
    "limite": 1
  },
  {
    "id": "nte-20-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 20",
    "limite": 1
  },
  {
    "id": "nte-20-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 20",
    "limite": 1
  },
  {
    "id": "nte-21-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 21",
    "limite": 1
  },
  {
    "id": "nte-21-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 21",
    "limite": 1
  },
  {
    "id": "nte-21-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 21",
    "limite": 1
  },
  {
    "id": "nte-22-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 22",
    "limite": 1
  },
  {
    "id": "nte-22-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 22",
    "limite": 1
  },
  {
    "id": "nte-22-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 22",
    "limite": 1
  },
  {
    "id": "nte-23-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 23",
    "limite": 1
  },
  {
    "id": "nte-23-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 23",
    "limite": 1
  },
  {
    "id": "nte-23-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 23",
    "limite": 1
  },
  {
    "id": "nte-24-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 24",
    "limite": 1
  },
  {
    "id": "nte-24-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 24",
    "limite": 1
  },
  {
    "id": "nte-24-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 24",
    "limite": 1
  },
  {
    "id": "nte-25-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 25",
    "limite": 1
  },
  {
    "id": "nte-25-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 25",
    "limite": 1
  },
  {
    "id": "nte-25-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 25",
    "limite": 1
  },
  {
    "id": "nte-26-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 26",
    "limite": 1
  },
  {
    "id": "nte-26-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 26",
    "limite": 1
  },
  {
    "id": "nte-26-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 26",
    "limite": 1
  },
  {
    "id": "nte-27-diretor",
    "nome": "Diretor(a)",
    "tipo": "NTE",
    "nte": "NTE 27",
    "limite": 1
  },
  {
    "id": "nte-27-ponto-focal",
    "nome": "Ponto Focal do SABE",
    "tipo": "NTE",
    "nte": "NTE 27",
    "limite": 1
  },
  {
    "id": "nte-27-coordenador",
    "nome": "Coordenador(a) Pedagógico(a)",
    "tipo": "NTE",
    "nte": "NTE 27",
    "limite": 1
  },
  {
    "id": "suprot",
    "nome": "SUPROT",
    "tipo": "INSTITUCIONAL",
    "limites": {
      "eja": 5,
      "ept": 10
    }
  },
  {
    "id": "suped",
    "nome": "SUPED",
    "tipo": "INSTITUCIONAL",
    "limites": {
      "eja": 10,
      "ept": 5
    }
  },
  {
    "id": "iat",
    "nome": "IAT",
    "tipo": "INSTITUCIONAL",
    "limite": 8
  },
  {
    "id": "supec",
    "nome": "SUPEC",
    "tipo": "INSTITUCIONAL",
    "limite": 5
  },
  {
    "id": "sudepe",
    "nome": "SUDEPE",
    "tipo": "INSTITUCIONAL",
    "limite": 2
  },
  {
    "id": "sginf-die",
    "nome": "DIE",
    "tipo": "INSTITUCIONAL",
    "limite": 13,
    "setor": "SGINF"
  },
  {
    "id": "sginf-dai",
    "nome": "DAI",
    "tipo": "INSTITUCIONAL",
    "limite": 4,
    "setor": "SGINF"
  },
  {
    "id": "sginf-diroe",
    "nome": "DIROE",
    "tipo": "INSTITUCIONAL",
    "limite": 4,
    "setor": "SGINF"
  },
  {
    "id": "ceepe",
    "nome": "CEEPE",
    "tipo": "INSTITUCIONAL",
    "limite": 2
  },
  {
    "id": "egepi",
    "nome": "EGEPI",
    "tipo": "INSTITUCIONAL",
    "limite": 2
  },
  {
    "id": "fgv-dgpe",
    "nome": "FGV/DGPE",
    "tipo": "INSTITUCIONAL",
    "limite": 5
  },
  {
    "id": "irdeb",
    "nome": "IRDEB",
    "tipo": "INSTITUCIONAL",
    "limite": 2
  },
  {
    "id": "tce",
    "nome": "TCE",
    "tipo": "INSTITUCIONAL",
    "limite": 2
  },
  {
    "id": "apg",
    "nome": "APG",
    "tipo": "INSTITUCIONAL",
    "limite": 4
  },
  {
    "id": "gab-sec",
    "nome": "GAB/SEC",
    "tipo": "INSTITUCIONAL",
    "limite": 5
  },
  {
    "id": "gestao-escolar-salvador",
    "nome": "Gestão Escolar - Salvador",
    "tipo": "INSTITUCIONAL",
    "limite": 90
  },
  {
    "id": "equipe-sec",
    "nome": "EQUIPE SEC",
    "tipo": "INSTITUCIONAL",
    "limite": 6
  }
];
var CATALOGO_MUNICIPIOS = [
  {
    "nome": "Abaíra",
    "nte": "NTE 03"
  },
  {
    "nome": "Abaré",
    "nte": "NTE 24"
  },
  {
    "nome": "Acajutiba",
    "nte": "NTE 18"
  },
  {
    "nome": "Adustina",
    "nte": "NTE 17"
  },
  {
    "nome": "Água Fria",
    "nte": "NTE 19"
  },
  {
    "nome": "Aiquara",
    "nte": "NTE 22"
  },
  {
    "nome": "Alagoinhas",
    "nte": "NTE 18"
  },
  {
    "nome": "Alcobaça",
    "nte": "NTE 07"
  },
  {
    "nome": "Almadina",
    "nte": "NTE 05"
  },
  {
    "nome": "Amargosa",
    "nte": "NTE 09"
  },
  {
    "nome": "Amélia Rodrigues",
    "nte": "NTE 19"
  },
  {
    "nome": "América Dourada",
    "nte": "NTE 01"
  },
  {
    "nome": "Anagé",
    "nte": "NTE 20"
  },
  {
    "nome": "Andaraí",
    "nte": "NTE 03"
  },
  {
    "nome": "Andorinha",
    "nte": "NTE 25"
  },
  {
    "nome": "Angical",
    "nte": "NTE 11"
  },
  {
    "nome": "Anguera",
    "nte": "NTE 19"
  },
  {
    "nome": "Antas",
    "nte": "NTE 17"
  },
  {
    "nome": "Antônio Cardoso",
    "nte": "NTE 19"
  },
  {
    "nome": "Antônio Gonçalves",
    "nte": "NTE 25"
  },
  {
    "nome": "Aporá",
    "nte": "NTE 18"
  },
  {
    "nome": "Apuarema",
    "nte": "NTE 22"
  },
  {
    "nome": "Araçás",
    "nte": "NTE 18"
  },
  {
    "nome": "Aracatu",
    "nte": "NTE 20"
  },
  {
    "nome": "Araci",
    "nte": "NTE 04"
  },
  {
    "nome": "Aramari",
    "nte": "NTE 18"
  },
  {
    "nome": "Arataca",
    "nte": "NTE 05"
  },
  {
    "nome": "Aratuípe",
    "nte": "NTE 06"
  },
  {
    "nome": "Aurelino Leal",
    "nte": "NTE 05"
  },
  {
    "nome": "Baianópolis",
    "nte": "NTE 11"
  },
  {
    "nome": "Baixa Grande",
    "nte": "NTE 15"
  },
  {
    "nome": "Banzaê",
    "nte": "NTE 17"
  },
  {
    "nome": "Barra",
    "nte": "NTE 02"
  },
  {
    "nome": "Barra da Estiva",
    "nte": "NTE 03"
  },
  {
    "nome": "Barra do Choça",
    "nte": "NTE 20"
  },
  {
    "nome": "Barra do Mendes",
    "nte": "NTE 01"
  },
  {
    "nome": "Barra do Rocha",
    "nte": "NTE 22"
  },
  {
    "nome": "Barreiras",
    "nte": "NTE 11"
  },
  {
    "nome": "Barro Alto",
    "nte": "NTE 01"
  },
  {
    "nome": "Barro Preto",
    "nte": "NTE 05"
  },
  {
    "nome": "Barrocas",
    "nte": "NTE 04"
  },
  {
    "nome": "Belmonte",
    "nte": "NTE 27"
  },
  {
    "nome": "Belo Campo",
    "nte": "NTE 20"
  },
  {
    "nome": "Biritinga",
    "nte": "NTE 04"
  },
  {
    "nome": "Boa Nova",
    "nte": "NTE 22"
  },
  {
    "nome": "Boa Vista do Tupim",
    "nte": "NTE 14"
  },
  {
    "nome": "Bom Jesus da Lapa",
    "nte": "NTE 02"
  },
  {
    "nome": "Bom Jesus da Serra",
    "nte": "NTE 20"
  },
  {
    "nome": "Boninal",
    "nte": "NTE 03"
  },
  {
    "nome": "Bonito",
    "nte": "NTE 03"
  },
  {
    "nome": "Boquira",
    "nte": "NTE 12"
  },
  {
    "nome": "Botuporã",
    "nte": "NTE 12"
  },
  {
    "nome": "Brejões",
    "nte": "NTE 09"
  },
  {
    "nome": "Brejolândia",
    "nte": "NTE 23"
  },
  {
    "nome": "Brotas de Macaúbas",
    "nte": "NTE 02"
  },
  {
    "nome": "Brumado",
    "nte": "NTE 13"
  },
  {
    "nome": "Buerarema",
    "nte": "NTE 05"
  },
  {
    "nome": "Buritirama",
    "nte": "NTE 11"
  },
  {
    "nome": "Caatiba",
    "nte": "NTE 08"
  },
  {
    "nome": "Cabaceiras do Paraguaçu",
    "nte": "NTE 21"
  },
  {
    "nome": "Cachoeira",
    "nte": "NTE 21"
  },
  {
    "nome": "Caculé",
    "nte": "NTE 13"
  },
  {
    "nome": "Caém",
    "nte": "NTE 16"
  },
  {
    "nome": "Caetanos",
    "nte": "NTE 20"
  },
  {
    "nome": "Caetité",
    "nte": "NTE 13"
  },
  {
    "nome": "Cafarnaum",
    "nte": "NTE 01"
  },
  {
    "nome": "Cairu",
    "nte": "NTE 06"
  },
  {
    "nome": "Caldeirão Grande",
    "nte": "NTE 25"
  },
  {
    "nome": "Camacan",
    "nte": "NTE 05"
  },
  {
    "nome": "Camaçari",
    "nte": "NTE 26"
  },
  {
    "nome": "Camamu",
    "nte": "NTE 06"
  },
  {
    "nome": "Campo Alegre de Lourdes",
    "nte": "NTE 10"
  },
  {
    "nome": "Campo Formoso",
    "nte": "NTE 25"
  },
  {
    "nome": "Canápolis",
    "nte": "NTE 23"
  },
  {
    "nome": "Canarana",
    "nte": "NTE 01"
  },
  {
    "nome": "Canavieiras",
    "nte": "NTE 05"
  },
  {
    "nome": "Candeal",
    "nte": "NTE 04"
  },
  {
    "nome": "Candeias",
    "nte": "NTE 26"
  },
  {
    "nome": "Candiba",
    "nte": "NTE 13"
  },
  {
    "nome": "Cândido Sales",
    "nte": "NTE 20"
  },
  {
    "nome": "Cansanção",
    "nte": "NTE 04"
  },
  {
    "nome": "Canudos",
    "nte": "NTE 10"
  },
  {
    "nome": "Capela do Alto Alegre",
    "nte": "NTE 15"
  },
  {
    "nome": "Capim Grosso",
    "nte": "NTE 15"
  },
  {
    "nome": "Caraíbas",
    "nte": "NTE 20"
  },
  {
    "nome": "Caravelas",
    "nte": "NTE 07"
  },
  {
    "nome": "Cardeal da Silva",
    "nte": "NTE 18"
  },
  {
    "nome": "Carinhanha",
    "nte": "NTE 02"
  },
  {
    "nome": "Casa Nova",
    "nte": "NTE 10"
  },
  {
    "nome": "Castro Alves",
    "nte": "NTE 21"
  },
  {
    "nome": "Catolândia",
    "nte": "NTE 11"
  },
  {
    "nome": "Catu",
    "nte": "NTE 18"
  },
  {
    "nome": "Caturama",
    "nte": "NTE 12"
  },
  {
    "nome": "Central",
    "nte": "NTE 01"
  },
  {
    "nome": "Chorrochó",
    "nte": "NTE 24"
  },
  {
    "nome": "Cícero Dantas",
    "nte": "NTE 17"
  },
  {
    "nome": "Cipó",
    "nte": "NTE 17"
  },
  {
    "nome": "Coaraci",
    "nte": "NTE 05"
  },
  {
    "nome": "Cocos",
    "nte": "NTE 23"
  },
  {
    "nome": "Conceição da Feira",
    "nte": "NTE 19"
  },
  {
    "nome": "Conceição do Almeida",
    "nte": "NTE 21"
  },
  {
    "nome": "Conceição do Coité",
    "nte": "NTE 04"
  },
  {
    "nome": "Conceição do Jacuípe",
    "nte": "NTE 19"
  },
  {
    "nome": "Conde",
    "nte": "NTE 18"
  },
  {
    "nome": "Condeúba",
    "nte": "NTE 20"
  },
  {
    "nome": "Contendas do Sincorá",
    "nte": "NTE 13"
  },
  {
    "nome": "Coração de Maria",
    "nte": "NTE 19"
  },
  {
    "nome": "Cordeiros",
    "nte": "NTE 20"
  },
  {
    "nome": "Coribe",
    "nte": "NTE 23"
  },
  {
    "nome": "Coronel João Sá",
    "nte": "NTE 17"
  },
  {
    "nome": "Correntina",
    "nte": "NTE 23"
  },
  {
    "nome": "Cotegipe",
    "nte": "NTE 11"
  },
  {
    "nome": "Cravolândia",
    "nte": "NTE 09"
  },
  {
    "nome": "Crisópolis",
    "nte": "NTE 18"
  },
  {
    "nome": "Cristópolis",
    "nte": "NTE 11"
  },
  {
    "nome": "Cruz das Almas",
    "nte": "NTE 21"
  },
  {
    "nome": "Curaçá",
    "nte": "NTE 10"
  },
  {
    "nome": "Dário Meira",
    "nte": "NTE 22"
  },
  {
    "nome": "Dias d'Ávila",
    "nte": "NTE 26"
  },
  {
    "nome": "Dom Basílio",
    "nte": "NTE 13"
  },
  {
    "nome": "Dom Macedo Costa",
    "nte": "NTE 21"
  },
  {
    "nome": "Elísio Medrado",
    "nte": "NTE 09"
  },
  {
    "nome": "Encruzilhada",
    "nte": "NTE 20"
  },
  {
    "nome": "Entre Rios",
    "nte": "NTE 18"
  },
  {
    "nome": "Érico Cardoso",
    "nte": "NTE 12"
  },
  {
    "nome": "Esplanada",
    "nte": "NTE 18"
  },
  {
    "nome": "Euclides da Cunha",
    "nte": "NTE 17"
  },
  {
    "nome": "Eunápolis",
    "nte": "NTE 27"
  },
  {
    "nome": "Fátima",
    "nte": "NTE 17"
  },
  {
    "nome": "Feira da Mata",
    "nte": "NTE 02"
  },
  {
    "nome": "Feira de Santana",
    "nte": "NTE 19"
  },
  {
    "nome": "Filadélfia",
    "nte": "NTE 25"
  },
  {
    "nome": "Firmino Alves",
    "nte": "NTE 08"
  },
  {
    "nome": "Floresta Azul",
    "nte": "NTE 05"
  },
  {
    "nome": "Formosa do Rio Preto",
    "nte": "NTE 11"
  },
  {
    "nome": "Gandu",
    "nte": "NTE 06"
  },
  {
    "nome": "Gavião",
    "nte": "NTE 15"
  },
  {
    "nome": "Gentio do Ouro",
    "nte": "NTE 01"
  },
  {
    "nome": "Glória",
    "nte": "NTE 24"
  },
  {
    "nome": "Gongogi",
    "nte": "NTE 22"
  },
  {
    "nome": "Governador Mangabeira",
    "nte": "NTE 21"
  },
  {
    "nome": "Guajeru",
    "nte": "NTE 20"
  },
  {
    "nome": "Guanambi",
    "nte": "NTE 13"
  },
  {
    "nome": "Guaratinga",
    "nte": "NTE 27"
  },
  {
    "nome": "Heliópolis",
    "nte": "NTE 17"
  },
  {
    "nome": "Iaçu",
    "nte": "NTE 14"
  },
  {
    "nome": "Ibiassucê",
    "nte": "NTE 13"
  },
  {
    "nome": "Ibicaraí",
    "nte": "NTE 05"
  },
  {
    "nome": "Ibicoara",
    "nte": "NTE 03"
  },
  {
    "nome": "Ibicuí",
    "nte": "NTE 08"
  },
  {
    "nome": "Ibipeba",
    "nte": "NTE 01"
  },
  {
    "nome": "Ibipitanga",
    "nte": "NTE 12"
  },
  {
    "nome": "Ibiquera",
    "nte": "NTE 14"
  },
  {
    "nome": "Ibirapitanga",
    "nte": "NTE 06"
  },
  {
    "nome": "Ibirapuã",
    "nte": "NTE 07"
  },
  {
    "nome": "Ibirataia",
    "nte": "NTE 22"
  },
  {
    "nome": "Ibitiara",
    "nte": "NTE 03"
  },
  {
    "nome": "Ibititá",
    "nte": "NTE 01"
  },
  {
    "nome": "Ibotirama",
    "nte": "NTE 02"
  },
  {
    "nome": "Ichu",
    "nte": "NTE 04"
  },
  {
    "nome": "Igaporã",
    "nte": "NTE 02"
  },
  {
    "nome": "Igrapiúna",
    "nte": "NTE 06"
  },
  {
    "nome": "Iguaí",
    "nte": "NTE 08"
  },
  {
    "nome": "Ilhéus",
    "nte": "NTE 05"
  },
  {
    "nome": "Inhambupe",
    "nte": "NTE 18"
  },
  {
    "nome": "Ipecaetá",
    "nte": "NTE 19"
  },
  {
    "nome": "Ipiaú",
    "nte": "NTE 22"
  },
  {
    "nome": "Ipirá",
    "nte": "NTE 15"
  },
  {
    "nome": "Ipupiara",
    "nte": "NTE 01"
  },
  {
    "nome": "Irajuba",
    "nte": "NTE 09"
  },
  {
    "nome": "Iramaia",
    "nte": "NTE 03"
  },
  {
    "nome": "Iraquara",
    "nte": "NTE 03"
  },
  {
    "nome": "Irará",
    "nte": "NTE 19"
  },
  {
    "nome": "Irecê",
    "nte": "NTE 01"
  },
  {
    "nome": "Itabela",
    "nte": "NTE 27"
  },
  {
    "nome": "Itaberaba",
    "nte": "NTE 14"
  },
  {
    "nome": "Itabuna",
    "nte": "NTE 05"
  },
  {
    "nome": "Itacaré",
    "nte": "NTE 05"
  },
  {
    "nome": "Itaeté",
    "nte": "NTE 03"
  },
  {
    "nome": "Itagi",
    "nte": "NTE 22"
  },
  {
    "nome": "Itagibá",
    "nte": "NTE 22"
  },
  {
    "nome": "Itagimirim",
    "nte": "NTE 27"
  },
  {
    "nome": "Itaguaçu da Bahia",
    "nte": "NTE 01"
  },
  {
    "nome": "Itaju do Colônia",
    "nte": "NTE 05"
  },
  {
    "nome": "Itajuípe",
    "nte": "NTE 05"
  },
  {
    "nome": "Itamaraju",
    "nte": "NTE 07"
  },
  {
    "nome": "Itamari",
    "nte": "NTE 22"
  },
  {
    "nome": "Itambé",
    "nte": "NTE 08"
  },
  {
    "nome": "Itanagra",
    "nte": "NTE 18"
  },
  {
    "nome": "Itanhém",
    "nte": "NTE 07"
  },
  {
    "nome": "Itaparica",
    "nte": "NTE 26"
  },
  {
    "nome": "Itapé",
    "nte": "NTE 05"
  },
  {
    "nome": "Itapebi",
    "nte": "NTE 27"
  },
  {
    "nome": "Itapetinga",
    "nte": "NTE 08"
  },
  {
    "nome": "Itapicuru",
    "nte": "NTE 18"
  },
  {
    "nome": "Itapitanga",
    "nte": "NTE 05"
  },
  {
    "nome": "Itaquara",
    "nte": "NTE 09"
  },
  {
    "nome": "Itarantim",
    "nte": "NTE 08"
  },
  {
    "nome": "Itatim",
    "nte": "NTE 14"
  },
  {
    "nome": "Itiruçu",
    "nte": "NTE 09"
  },
  {
    "nome": "Itiúba",
    "nte": "NTE 04"
  },
  {
    "nome": "Itororó",
    "nte": "NTE 08"
  },
  {
    "nome": "Ituaçu",
    "nte": "NTE 13"
  },
  {
    "nome": "Ituberá",
    "nte": "NTE 06"
  },
  {
    "nome": "Iuiú",
    "nte": "NTE 13"
  },
  {
    "nome": "Jaborandi",
    "nte": "NTE 23"
  },
  {
    "nome": "Jacaraci",
    "nte": "NTE 20"
  },
  {
    "nome": "Jacobina",
    "nte": "NTE 16"
  },
  {
    "nome": "Jaguaquara",
    "nte": "NTE 09"
  },
  {
    "nome": "Jaguarari",
    "nte": "NTE 25"
  },
  {
    "nome": "Jaguaripe",
    "nte": "NTE 06"
  },
  {
    "nome": "Jandaíra",
    "nte": "NTE 18"
  },
  {
    "nome": "Jequié",
    "nte": "NTE 22"
  },
  {
    "nome": "Jeremoabo",
    "nte": "NTE 17"
  },
  {
    "nome": "Jiquiriçá",
    "nte": "NTE 09"
  },
  {
    "nome": "Jitaúna",
    "nte": "NTE 22"
  },
  {
    "nome": "João Dourado",
    "nte": "NTE 01"
  },
  {
    "nome": "Juazeiro",
    "nte": "NTE 10"
  },
  {
    "nome": "Jucuruçu",
    "nte": "NTE 07"
  },
  {
    "nome": "Jussara",
    "nte": "NTE 01"
  },
  {
    "nome": "Jussari",
    "nte": "NTE 05"
  },
  {
    "nome": "Jussiape",
    "nte": "NTE 03"
  },
  {
    "nome": "Lafaiete Coutinho",
    "nte": "NTE 09"
  },
  {
    "nome": "Lagoa Real",
    "nte": "NTE 13"
  },
  {
    "nome": "Laje",
    "nte": "NTE 09"
  },
  {
    "nome": "Lajedão",
    "nte": "NTE 07"
  },
  {
    "nome": "Lajedinho",
    "nte": "NTE 14"
  },
  {
    "nome": "Lajedo do Tabocal",
    "nte": "NTE 09"
  },
  {
    "nome": "Lamarão",
    "nte": "NTE 04"
  },
  {
    "nome": "Lapão",
    "nte": "NTE 01"
  },
  {
    "nome": "Lauro de Freitas",
    "nte": "NTE 26"
  },
  {
    "nome": "Lençóis",
    "nte": "NTE 03"
  },
  {
    "nome": "Licínio de Almeida",
    "nte": "NTE 20"
  },
  {
    "nome": "Livramento de Nossa Senhora",
    "nte": "NTE 13"
  },
  {
    "nome": "Luís Eduardo Magalhães",
    "nte": "NTE 11"
  },
  {
    "nome": "Macajuba",
    "nte": "NTE 14"
  },
  {
    "nome": "Macarani",
    "nte": "NTE 08"
  },
  {
    "nome": "Macaúbas",
    "nte": "NTE 12"
  },
  {
    "nome": "Macururé",
    "nte": "NTE 24"
  },
  {
    "nome": "Madre de Deus",
    "nte": "NTE 26"
  },
  {
    "nome": "Maetinga",
    "nte": "NTE 20"
  },
  {
    "nome": "Maiquinique",
    "nte": "NTE 08"
  },
  {
    "nome": "Mairi",
    "nte": "NTE 15"
  },
  {
    "nome": "Malhada",
    "nte": "NTE 02"
  },
  {
    "nome": "Malhada de Pedras",
    "nte": "NTE 13"
  },
  {
    "nome": "Manoel Vitorino",
    "nte": "NTE 22"
  },
  {
    "nome": "Mansidão",
    "nte": "NTE 11"
  },
  {
    "nome": "Maracás",
    "nte": "NTE 09"
  },
  {
    "nome": "Maragogipe",
    "nte": "NTE 21"
  },
  {
    "nome": "Maraú",
    "nte": "NTE 05"
  },
  {
    "nome": "Marcionílio Souza",
    "nte": "NTE 03"
  },
  {
    "nome": "Mascote",
    "nte": "NTE 05"
  },
  {
    "nome": "Mata de São João",
    "nte": "NTE 26"
  },
  {
    "nome": "Matina",
    "nte": "NTE 02"
  },
  {
    "nome": "Medeiros Neto",
    "nte": "NTE 07"
  },
  {
    "nome": "Miguel Calmon",
    "nte": "NTE 16"
  },
  {
    "nome": "Milagres",
    "nte": "NTE 09"
  },
  {
    "nome": "Mirangaba",
    "nte": "NTE 16"
  },
  {
    "nome": "Mirante",
    "nte": "NTE 20"
  },
  {
    "nome": "Monte Santo",
    "nte": "NTE 04"
  },
  {
    "nome": "Morpara",
    "nte": "NTE 02"
  },
  {
    "nome": "Morro do Chapéu",
    "nte": "NTE 03"
  },
  {
    "nome": "Mortugaba",
    "nte": "NTE 20"
  },
  {
    "nome": "Mucugê",
    "nte": "NTE 03"
  },
  {
    "nome": "Mucuri",
    "nte": "NTE 07"
  },
  {
    "nome": "Mulungu do Morro",
    "nte": "NTE 01"
  },
  {
    "nome": "Mundo Novo",
    "nte": "NTE 14"
  },
  {
    "nome": "Muniz Ferreira",
    "nte": "NTE 21"
  },
  {
    "nome": "Muquém de São Francisco",
    "nte": "NTE 02"
  },
  {
    "nome": "Muritiba",
    "nte": "NTE 21"
  },
  {
    "nome": "Mutuípe",
    "nte": "NTE 09"
  },
  {
    "nome": "Nazaré",
    "nte": "NTE 21"
  },
  {
    "nome": "Nilo Peçanha",
    "nte": "NTE 06"
  },
  {
    "nome": "Nordestina",
    "nte": "NTE 04"
  },
  {
    "nome": "Nova Canaã",
    "nte": "NTE 08"
  },
  {
    "nome": "Nova Fátima",
    "nte": "NTE 15"
  },
  {
    "nome": "Nova Ibiá",
    "nte": "NTE 22"
  },
  {
    "nome": "Nova Itarana",
    "nte": "NTE 09"
  },
  {
    "nome": "Nova Redenção",
    "nte": "NTE 03"
  },
  {
    "nome": "Nova Soure",
    "nte": "NTE 17"
  },
  {
    "nome": "Nova Viçosa",
    "nte": "NTE 07"
  },
  {
    "nome": "Novo Horizonte",
    "nte": "NTE 03"
  },
  {
    "nome": "Novo Triunfo",
    "nte": "NTE 17"
  },
  {
    "nome": "Olindina",
    "nte": "NTE 18"
  },
  {
    "nome": "Oliveira dos Brejinhos",
    "nte": "NTE 02"
  },
  {
    "nome": "Ouriçangas",
    "nte": "NTE 18"
  },
  {
    "nome": "Ourolândia",
    "nte": "NTE 16"
  },
  {
    "nome": "Palmas de Monte Alto",
    "nte": "NTE 13"
  },
  {
    "nome": "Palmeiras",
    "nte": "NTE 03"
  },
  {
    "nome": "Paramirim",
    "nte": "NTE 12"
  },
  {
    "nome": "Paratinga",
    "nte": "NTE 02"
  },
  {
    "nome": "Paripiranga",
    "nte": "NTE 17"
  },
  {
    "nome": "Pau Brasil",
    "nte": "NTE 05"
  },
  {
    "nome": "Paulo Afonso",
    "nte": "NTE 24"
  },
  {
    "nome": "Pé de Serra",
    "nte": "NTE 15"
  },
  {
    "nome": "Pedrão",
    "nte": "NTE 18"
  },
  {
    "nome": "Pedro Alexandre",
    "nte": "NTE 17"
  },
  {
    "nome": "Piatã",
    "nte": "NTE 03"
  },
  {
    "nome": "Pilão Arcado",
    "nte": "NTE 10"
  },
  {
    "nome": "Pindaí",
    "nte": "NTE 13"
  },
  {
    "nome": "Pindobaçu",
    "nte": "NTE 25"
  },
  {
    "nome": "Pintadas",
    "nte": "NTE 15"
  },
  {
    "nome": "Piraí do Norte",
    "nte": "NTE 06"
  },
  {
    "nome": "Piripá",
    "nte": "NTE 20"
  },
  {
    "nome": "Piritiba",
    "nte": "NTE 14"
  },
  {
    "nome": "Planaltino",
    "nte": "NTE 09"
  },
  {
    "nome": "Planalto",
    "nte": "NTE 20"
  },
  {
    "nome": "Poções",
    "nte": "NTE 20"
  },
  {
    "nome": "Pojuca",
    "nte": "NTE 26"
  },
  {
    "nome": "Ponto Novo",
    "nte": "NTE 25"
  },
  {
    "nome": "Porto Seguro",
    "nte": "NTE 27"
  },
  {
    "nome": "Potiraguá",
    "nte": "NTE 08"
  },
  {
    "nome": "Prado",
    "nte": "NTE 07"
  },
  {
    "nome": "Presidente Dutra",
    "nte": "NTE 01"
  },
  {
    "nome": "Presidente Jânio Quadros",
    "nte": "NTE 20"
  },
  {
    "nome": "Presidente Tancredo Neves",
    "nte": "NTE 06"
  },
  {
    "nome": "Queimadas",
    "nte": "NTE 04"
  },
  {
    "nome": "Quijingue",
    "nte": "NTE 04"
  },
  {
    "nome": "Quixabeira",
    "nte": "NTE 15"
  },
  {
    "nome": "Rafael Jambeiro",
    "nte": "NTE 14"
  },
  {
    "nome": "Remanso",
    "nte": "NTE 10"
  },
  {
    "nome": "Retirolândia",
    "nte": "NTE 04"
  },
  {
    "nome": "Riachão das Neves",
    "nte": "NTE 11"
  },
  {
    "nome": "Riachão do Jacuípe",
    "nte": "NTE 15"
  },
  {
    "nome": "Riacho de Santana",
    "nte": "NTE 02"
  },
  {
    "nome": "Ribeira do Amparo",
    "nte": "NTE 17"
  },
  {
    "nome": "Ribeira do Pombal",
    "nte": "NTE 17"
  },
  {
    "nome": "Ribeirão do Largo",
    "nte": "NTE 20"
  },
  {
    "nome": "Rio Real",
    "nte": "NTE 18"
  },
  {
    "nome": "Rio de Contas",
    "nte": "NTE 03"
  },
  {
    "nome": "Rio do Antônio",
    "nte": "NTE 13"
  },
  {
    "nome": "Rio do Pires",
    "nte": "NTE 12"
  },
  {
    "nome": "Rodelas",
    "nte": "NTE 24"
  },
  {
    "nome": "Ruy Barbosa",
    "nte": "NTE 14"
  },
  {
    "nome": "Salinas da Margarida",
    "nte": "NTE 21"
  },
  {
    "nome": "Salvador",
    "nte": "NTE 26"
  },
  {
    "nome": "Santa Bárbara",
    "nte": "NTE 19"
  },
  {
    "nome": "Santa Brígida",
    "nte": "NTE 17"
  },
  {
    "nome": "Santa Cruz Cabrália",
    "nte": "NTE 27"
  },
  {
    "nome": "Santa Cruz da Vitória",
    "nte": "NTE 08"
  },
  {
    "nome": "Santa Inês",
    "nte": "NTE 09"
  },
  {
    "nome": "Santa Luzia",
    "nte": "NTE 05"
  },
  {
    "nome": "Santa Maria da Vitória",
    "nte": "NTE 23"
  },
  {
    "nome": "Santa Rita de Cássia",
    "nte": "NTE 11"
  },
  {
    "nome": "Santa Teresinha",
    "nte": "NTE 14"
  },
  {
    "nome": "Santaluz",
    "nte": "NTE 04"
  },
  {
    "nome": "Santana",
    "nte": "NTE 23"
  },
  {
    "nome": "Santanópolis",
    "nte": "NTE 19"
  },
  {
    "nome": "Santo Amaro",
    "nte": "NTE 21"
  },
  {
    "nome": "Santo Antônio de Jesus",
    "nte": "NTE 21"
  },
  {
    "nome": "Santo Estêvão",
    "nte": "NTE 19"
  },
  {
    "nome": "São Desidério",
    "nte": "NTE 11"
  },
  {
    "nome": "São Domingos",
    "nte": "NTE 04"
  },
  {
    "nome": "São Felipe",
    "nte": "NTE 21"
  },
  {
    "nome": "São Félix",
    "nte": "NTE 21"
  },
  {
    "nome": "São Félix do Coribe",
    "nte": "NTE 23"
  },
  {
    "nome": "São Francisco do Conde",
    "nte": "NTE 26"
  },
  {
    "nome": "São Gabriel",
    "nte": "NTE 01"
  },
  {
    "nome": "São Gonçalo dos Campos",
    "nte": "NTE 19"
  },
  {
    "nome": "São José da Vitória",
    "nte": "NTE 05"
  },
  {
    "nome": "São José do Jacuípe",
    "nte": "NTE 15"
  },
  {
    "nome": "São Miguel das Matas",
    "nte": "NTE 09"
  },
  {
    "nome": "São Sebastião do Passé",
    "nte": "NTE 26"
  },
  {
    "nome": "Sapeaçu",
    "nte": "NTE 21"
  },
  {
    "nome": "Sátiro Dias",
    "nte": "NTE 18"
  },
  {
    "nome": "Saubara",
    "nte": "NTE 21"
  },
  {
    "nome": "Saúde",
    "nte": "NTE 16"
  },
  {
    "nome": "Seabra",
    "nte": "NTE 03"
  },
  {
    "nome": "Sebastião Laranjeiras",
    "nte": "NTE 13"
  },
  {
    "nome": "Senhor do Bonfim",
    "nte": "NTE 25"
  },
  {
    "nome": "Sento Sé",
    "nte": "NTE 10"
  },
  {
    "nome": "Serra Dourada",
    "nte": "NTE 23"
  },
  {
    "nome": "Serra Preta",
    "nte": "NTE 15"
  },
  {
    "nome": "Serra do Ramalho",
    "nte": "NTE 02"
  },
  {
    "nome": "Serrinha",
    "nte": "NTE 04"
  },
  {
    "nome": "Serrolândia",
    "nte": "NTE 16"
  },
  {
    "nome": "Simões Filho",
    "nte": "NTE 26"
  },
  {
    "nome": "Sítio do Mato",
    "nte": "NTE 02"
  },
  {
    "nome": "Sítio do Quinto",
    "nte": "NTE 17"
  },
  {
    "nome": "Sobradinho",
    "nte": "NTE 10"
  },
  {
    "nome": "Souto Soares",
    "nte": "NTE 03"
  },
  {
    "nome": "Tabocas do Brejo Velho",
    "nte": "NTE 23"
  },
  {
    "nome": "Tanhaçu",
    "nte": "NTE 13"
  },
  {
    "nome": "Tanque Novo",
    "nte": "NTE 13"
  },
  {
    "nome": "Tanquinho",
    "nte": "NTE 19"
  },
  {
    "nome": "Taperoá",
    "nte": "NTE 06"
  },
  {
    "nome": "Tapiramutá",
    "nte": "NTE 14"
  },
  {
    "nome": "Teixeira de Freitas",
    "nte": "NTE 07"
  },
  {
    "nome": "Teodoro Sampaio",
    "nte": "NTE 19"
  },
  {
    "nome": "Teofilândia",
    "nte": "NTE 04"
  },
  {
    "nome": "Teolândia",
    "nte": "NTE 06"
  },
  {
    "nome": "Terra Nova",
    "nte": "NTE 19"
  },
  {
    "nome": "Tremedal",
    "nte": "NTE 20"
  },
  {
    "nome": "Tucano",
    "nte": "NTE 04"
  },
  {
    "nome": "Uauá",
    "nte": "NTE 10"
  },
  {
    "nome": "Ubaíra",
    "nte": "NTE 09"
  },
  {
    "nome": "Ubaitaba",
    "nte": "NTE 05"
  },
  {
    "nome": "Ubatã",
    "nte": "NTE 22"
  },
  {
    "nome": "Uibaí",
    "nte": "NTE 01"
  },
  {
    "nome": "Umburanas",
    "nte": "NTE 16"
  },
  {
    "nome": "Una",
    "nte": "NTE 05"
  },
  {
    "nome": "Urandi",
    "nte": "NTE 13"
  },
  {
    "nome": "Uruçuca",
    "nte": "NTE 05"
  },
  {
    "nome": "Utinga",
    "nte": "NTE 03"
  },
  {
    "nome": "Valença",
    "nte": "NTE 06"
  },
  {
    "nome": "Valente",
    "nte": "NTE 04"
  },
  {
    "nome": "Várzea Nova",
    "nte": "NTE 16"
  },
  {
    "nome": "Várzea da Roça",
    "nte": "NTE 15"
  },
  {
    "nome": "Várzea do Poço",
    "nte": "NTE 15"
  },
  {
    "nome": "Varzedo",
    "nte": "NTE 21"
  },
  {
    "nome": "Vera Cruz",
    "nte": "NTE 26"
  },
  {
    "nome": "Vereda",
    "nte": "NTE 07"
  },
  {
    "nome": "Vitória da Conquista",
    "nte": "NTE 20"
  },
  {
    "nome": "Wagner",
    "nte": "NTE 03"
  },
  {
    "nome": "Wanderley",
    "nte": "NTE 11"
  },
  {
    "nome": "Wenceslau Guimarães",
    "nte": "NTE 06"
  },
  {
    "nome": "Xique-Xique",
    "nte": "NTE 01"
  }
];
