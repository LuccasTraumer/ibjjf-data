const fs = require('fs');
const path = require('path');

// Schema unificado para rankingAcademias
const UNIFIED_RANKING_SCHEMA = {
    posicao: 'number',    // place -> posicao
    academia: 'string',   // name -> academia
    pontos: 'number'      // points -> pontos (string -> number)
};

function normalizeRankingEntry(entry) {
    const normalized = {};
    
    // Normalizar posição
    if (entry.place !== undefined) {
        normalized.posicao = parseInt(entry.place) || 0;
    } else if (entry.posicao !== undefined) {
        normalized.posicao = typeof entry.posicao === 'number' ? entry.posicao : parseInt(entry.posicao) || 0;
    }
    
    // Normalizar academia
    if (entry.name !== undefined) {
        normalized.academia = entry.name;
    } else if (entry.academia !== undefined) {
        normalized.academia = entry.academia;
    }
    
    // Normalizar pontos
    if (entry.points !== undefined) {
        // Converter string vazia para 0, senão tentar converter para número
        normalized.pontos = entry.points === "" ? 0 : (parseInt(entry.points) || 0);
    } else if (entry.pontos !== undefined) {
        normalized.pontos = typeof entry.pontos === 'number' ? entry.pontos : (parseInt(entry.pontos) || 0);
    } else {
        normalized.pontos = 0;
    }
    
    return normalized;
}

function normalizeRankingAcademias(rankingAcademias) {
    if (!Array.isArray(rankingAcademias) || rankingAcademias.length === 0) {
        return rankingAcademias;
    }
    
    // Verificar se é a estrutura especial do 1999 (world-ibjjf)
    const firstItem = rankingAcademias[0];
    if (firstItem.academyName !== undefined || firstItem.categories !== undefined) {
        // Estrutura especial - converter para formato padrão
        const normalizedRanking = {};
        
        if (firstItem.categories && Array.isArray(firstItem.categories)) {
            firstItem.categories.forEach(category => {
                if (category.categoryName && category.ranking) {
                    normalizedRanking[category.categoryName] = category.ranking.map(normalizeRankingEntry);
                }
            });
        }
        
        return [normalizedRanking];
    }
    
    // Estrutura padrão - normalizar cada categoria
    return rankingAcademias.map(rankingObj => {
        const normalizedObj = {};
        
        Object.keys(rankingObj).forEach(category => {
            if (Array.isArray(rankingObj[category])) {
                normalizedObj[category] = rankingObj[category].map(normalizeRankingEntry);
            }
        });
        
        return normalizedObj;
    });
}

function processJsonFile(filePath) {
    try {
        console.log(`📄 Processando: ${path.basename(filePath)}`);
        
        // Ler arquivo
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Verificar se tem rankingAcademias
        if (!content.includes('"rankingAcademias"')) {
            console.log(`⚠️  Arquivo não contém rankingAcademias: ${path.basename(filePath)}`);
            return true;
        }
        
        // Tentar fazer parse direto
        let data;
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            // Se falhar, tentar dividir múltiplos JSONs
            console.log(`⚠️  Parse direto falhou, tentando dividir múltiplos JSONs...`);
            
            const jsonParts = content.split(/(?<=\])\s*(?=\[)/);
            console.log(`📊 Encontrados ${jsonParts.length} arrays JSON`);
            
            let allData = [];
            let hasRankingAcademias = null;
            
            for (let i = 0; i < jsonParts.length; i++) {
                try {
                    let part = jsonParts[i].trim();
                    
                    // Verificar se esta parte contém rankingAcademias
                    if (part.includes('"rankingAcademias"')) {
                        // Esta parte contém o ranking, não é um array JSON normal
                        hasRankingAcademias = part;
                        continue;
                    }
                    
                    const parsedPart = JSON.parse(part);
                    if (Array.isArray(parsedPart)) {
                        allData = allData.concat(parsedPart);
                    }
                } catch (partError) {
                    console.log(`❌ Erro ao fazer parse do array ${i + 1}: ${partError.message}`);
                }
            }
            
            data = allData;
            
            // Se encontrou rankingAcademias separado, processar
            if (hasRankingAcademias) {
                // Extrair o objeto rankingAcademias
                const rankingMatch = hasRankingAcademias.match(/"rankingAcademias":\s*(\[.*?\])/s);
                if (rankingMatch) {
                    try {
                        const rankingData = JSON.parse(rankingMatch[1]);
                        const normalizedRanking = normalizeRankingAcademias(rankingData);
                        
                        // Reescrever o arquivo com dados normalizados + ranking normalizado
                        const newContent = JSON.stringify(data, null, 2) + '\n\n"rankingAcademias":' + JSON.stringify(normalizedRanking, null, 2);
                        fs.writeFileSync(filePath, newContent, 'utf8');
                        
                        console.log(`✅ Sucesso! Ranking de academias normalizado`);
                        return true;
                    } catch (rankingError) {
                        console.log(`❌ Erro ao processar rankingAcademias: ${rankingError.message}`);
                        return false;
                    }
                }
            }
        }
        
        // Se chegou aqui e data é um array simples, não tem rankingAcademias para processar
        if (Array.isArray(data)) {
            console.log(`⚠️  Arquivo contém apenas dados de competidores, sem rankingAcademias`);
            return true;
        }
        
        // Se data é um objeto, verificar se tem rankingAcademias
        if (data && typeof data === 'object' && data.rankingAcademias) {
            const normalizedRanking = normalizeRankingAcademias(data.rankingAcademias);
            data.rankingAcademias = normalizedRanking;
            
            // Reescrever arquivo
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`✅ Sucesso! Ranking de academias normalizado`);
            return true;
        }
        
        console.log(`⚠️  Estrutura de dados não reconhecida`);
        return false;
        
    } catch (error) {
        console.log(`❌ Erro ao processar ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Diretório não encontrado: ${dirPath}`);
        return { success: 0, errors: 0 };
    }
    
    console.log(`\n📁 Processando pasta: ${dirPath}`);
    console.log('=' .repeat(50));
    
    const files = fs.readdirSync(dirPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`📊 Encontrados ${jsonFiles.length} arquivos JSON`);
    
    let success = 0;
    let errors = 0;
    
    jsonFiles.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (processJsonFile(filePath)) {
            success++;
        } else {
            errors++;
        }
    });
    
    console.log(`\n📈 Resultados para ${dirPath}:`);
    console.log(`✅ Sucessos: ${success}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Taxa de sucesso: ${((success / jsonFiles.length) * 100).toFixed(1)}%`);
    
    return { success, errors };
}

function main() {
    console.log('🚀 Iniciando normalização do rankingAcademias...\n');
    
    const directories = [
        './brasileiro-ibjjf',
        './pan-ibjjf',
        './world-ibjjf'
    ];
    
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalFiles = 0;
    
    directories.forEach(dir => {
        const result = processDirectory(dir);
        totalSuccess += result.success;
        totalErrors += result.errors;
        totalFiles += result.success + result.errors;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESUMO FINAL:');
    console.log(`📁 Total de arquivos processados: ${totalFiles}`);
    console.log(`✅ Total de sucessos: ${totalSuccess}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    console.log(`📊 Taxa de sucesso geral: ${((totalSuccess / totalFiles) * 100).toFixed(1)}%`);
    
    if (totalErrors === 0) {
        console.log('\n🎉 Todos os rankingAcademias foram normalizados com sucesso!');
        console.log('📋 Schema unificado aplicado:');
        console.log('   • posicao: number (place -> posicao, string -> number)');
        console.log('   • academia: string (name -> academia)');
        console.log('   • pontos: number (points -> pontos, string -> number)');
    } else {
        console.log('\n⚠️  Alguns arquivos apresentaram erros.');
        console.log('💡 Verifique os logs acima para mais detalhes.');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { 
    normalizeRankingAcademias, 
    normalizeRankingEntry, 
    processJsonFile,
    processDirectory,
    main 
};