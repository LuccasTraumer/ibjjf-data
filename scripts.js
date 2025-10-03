// Pega os Atletas. col-sm-12 athletes
function extractAthletes() {
    const categories = document.querySelectorAll('.athletes .category');
    let result = [];

    categories.forEach(categoryEl => {
        const categoryName = categoryEl.textContent.trim();

        // A tabela sempre vem logo depois da div.category
        const table = categoryEl.nextElementSibling;
        const rows = table.querySelectorAll('tbody tr');

        let athletes = [];

        rows.forEach(row => {
            const place = row.querySelector('.place')?.textContent.trim();
            const name = row.querySelector('.athlete-name')?.textContent.trim();
            const academy = row.querySelector('.academy-name')?.textContent.trim();

            if (place && name && academy) {
                athletes.push({
                    place,
                    name,
                    academy
                });
            }
        });

        result.push({
            category: categoryName,
            ranking: athletes
        });
    });

    return result;
}

// A partir de 2012.
function extrairDadosDosAtletas() {
    // Seleciona o contêiner principal que agrupa todas as categorias e atletas.
    const containerPrincipal = document.querySelector('.col-athlete');

    // Se o contêiner não for encontrado, encerra a execução.
    if (!containerPrincipal) {
        console.error("O contêiner principal '.col-athlete' não foi encontrado.");
        return [];
    }

    // Seleciona todos os títulos de categoria.
    const titulosCategorias = containerPrincipal.querySelectorAll('h4.subtitle');

    // Array para armazenar o resultado final.
    const resultadosFinais = [];

    // Itera sobre cada elemento de título de categoria encontrado.
    titulosCategorias.forEach(tituloElement => {
        // Extrai e limpa o nome da categoria.
        const nomeCategoria = tituloElement.textContent.trim();

        // A lista de atletas é o elemento irmão que vem logo após o título.
        const listaAtletasElement = tituloElement.nextElementSibling;

        // Objeto para armazenar os dados desta categoria específica.
        const dadosCategoria = {
            categoria: nomeCategoria,
            ranking: []
        };

        // Verifica se a lista de atletas existe antes de prosseguir.
        if (listaAtletasElement && listaAtletasElement.classList.contains('list')) {
            // Seleciona todos os itens de atleta dentro da lista.
            const itensAtleta = listaAtletasElement.querySelectorAll('.athlete-item');

            // Itera sobre cada item de atleta.
            itensAtleta.forEach(atletaElement => {
                // Extrai a posição do atleta.
                const posicao = atletaElement.querySelector('.position-athlete').textContent.trim();

                // Elemento que contém o nome e a academia.
                const pElement = atletaElement.querySelector('.name p');

                // Extrai o nome da academia de dentro do <span>.
                const academia = pElement.querySelector('span').textContent.trim();

                // Para extrair apenas o nome do atleta, clonamos o parágrafo,
                // removemos o <span> (academia) do clone e então pegamos o texto.
                // Isso evita pegar o texto da academia junto com o nome.
                const pClone = pElement.cloneNode(true);
                pClone.querySelector('span').remove();
                const nomeAtleta = pClone.textContent.trim();

                // Adiciona o objeto do atleta ao array de ranking da categoria.
                dadosCategoria.ranking.push({
                    posicao: parseInt(posicao, 10), // Converte a posição para número
                    nome: nomeAtleta,
                    academia: academia
                });
            });
        }

        // Adiciona os dados da categoria processada ao resultado final.
        resultadosFinais.push(dadosCategoria);
    });

    return resultadosFinais;
}


// Resultado de Academias. col-sm-12 academy
function extrairCategorias() {
    const categorias = {};
    const categoryElements = document.querySelectorAll(".academy .category");

    categoryElements.forEach(categoryEl => {
        const nomeCategoria = categoryEl.textContent.trim();
        const tabela = categoryEl.nextElementSibling; // pega a <table> após a div.category
        const linhas = tabela.querySelectorAll("tbody tr");

        const ranking = Array.from(linhas).map(linha => {
            return {
                place: linha.querySelector(".place")?.textContent.trim(),
                name: linha.querySelector(".name")?.textContent.trim(),
                points: linha.querySelector(".points")?.textContent.trim()
            };
        });

        categorias[nomeCategoria] = ranking;
    });

    return categorias;
}

// a partir de 2012
function extrairRankingPorCategoria() {
    // Objeto para armazenar os resultados finais.
    const resultados = {};

    // Mapeamento dos títulos do HTML para os nomes de categoria desejados.
    const mapaCategorias = {
        'Adult Male': 'Masculino',
        'Adult Female': 'Feminino',
        'Juvenile': 'Juvenil'
    };

    // Seleciona todos os títulos de categoria.
    const titulosHtml = document.querySelectorAll('h4.subtitle');

    titulosHtml.forEach(tituloElement => {
        const nomeCategoriaHtml = tituloElement.textContent.trim();
        // Verifica se a categoria do HTML está no nosso mapa.
        const nomeCategoriaFinal = mapaCategorias[nomeCategoriaHtml];

        // Se a categoria não for uma das que queremos, simplesmente a ignora.
        if (!nomeCategoriaFinal) {
            return; // Pula para a próxima iteração
        }

        const listaElement = tituloElement.nextElementSibling;
        const rankingDaCategoria = [];

        if (listaElement && listaElement.classList.contains('list')) {
            const itensDaLista = listaElement.querySelectorAll('.list-item');

            itensDaLista.forEach(itemElement => {
                const posicao = itemElement.querySelector('.position').textContent.trim();
                const nomeAcademia = itemElement.querySelector('.name').textContent.trim();
                const pontos = itemElement.querySelector('.points').textContent.trim();

                rankingDaCategoria.push({
                    posicao: parseInt(posicao, 10),
                    academia: nomeAcademia,
                    pontos: parseInt(pontos, 10)
                });
            });
        }

        // Usa o nome mapeado ("Masculino", "Feminino", ou "Juvenil") como chave.
        resultados[nomeCategoriaFinal] = rankingDaCategoria;
    });

    return resultados;
}

// Pega o titulo da Pagina. document.querySelector("body > section:nth-child(2) > div.col-12.page-title.mt-0 > h3")
document.querySelector("body > section:nth-child(2) > div.col-12.page-title.mt-0 > h3")








function extrairRankingPorCategoria() {
    // Objeto para armazenar os resultados finais.
    const resultados = {};

    // Mapeamento dos títulos do HTML para os nomes de categoria desejados.
    const mapaCategorias = {
        'Adult': 'Masculino',
        'adult': 'Masculino',
        'Adult Male': 'Masculino',
        'adult male': 'Masculino',
        'Adult Female': 'Feminino',
        'adult female': 'Feminino',
        'Female': 'Feminino',
        'female': 'Feminino',
        'Juvenile': 'Juvenil',
        'juvenile': 'Juvenil',
        'Master and Seniors': 'Master and Seniors',
        'master and seniors': 'Master and Seniors',
        'Novice': 'Novice',
        'novice': 'Novice',
    };

    // Seleciona todos os títulos de categoria.
    const titulosHtml = document.querySelectorAll('h4.subtitle');

    titulosHtml.forEach(tituloElement => {
        const nomeCategoriaHtml = tituloElement.textContent.trim().toLowerCase();
        // Verifica se a categoria do HTML está no nosso mapa.
        const nomeCategoriaFinal = mapaCategorias[nomeCategoriaHtml];

        // Se a categoria não for uma das que queremos, simplesmente a ignora.
        if (!nomeCategoriaFinal) {
            return; // Pula para a próxima iteração
        }

        const listaElement = tituloElement.nextElementSibling;
        const rankingDaCategoria = [];

        if (listaElement && listaElement.classList.contains('list')) {
            const itensDaLista = listaElement.querySelectorAll('.list-item');

            itensDaLista.forEach(itemElement => {
                const posicao = itemElement.querySelector('.position').textContent.trim();
                const nomeAcademia = itemElement.querySelector('.name').textContent.trim();
                const pontos = itemElement.querySelector('.points').textContent.trim();

                rankingDaCategoria.push({
                    posicao: parseInt(posicao, 10),
                    academia: nomeAcademia,
                    pontos: parseInt(pontos, 10)
                });
            });
        }

        // Usa o nome mapeado ("Masculino", "Feminino", ou "Juvenil") como chave.
        resultados[nomeCategoriaFinal] = rankingDaCategoria;
    });

    return resultados;
}
