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
        
        // Estratégia: dividir o conteúdo em duas partes - antes e depois do rankingAcademias
        const rankingIndex = content.indexOf('"rankingAcademias"');
        if (rankingIndex === -1) {
            console.log(`⚠️  rankingAcademias não encontrado no arquivo`);
            return true;
        }
        
        // Encontrar o início do array principal (antes do rankingAcademias)
        const beforeRanking = content.substring(0, rankingIndex).trim();
        const afterRankingStart = content.substring(rankingIndex);
        
        // Remover possível quebra de linha e aspas extras antes do rankingAcademias
        let cleanBeforeRanking = beforeRanking;
        if (cleanBeforeRanking.endsWith('\n\n')) {
            cleanBeforeRanking = cleanBeforeRanking.slice(0, -2);
        }
        if (cleanBeforeRanking.endsWith('\n')) {
            cleanBeforeRanking = cleanBeforeRanking.slice(0, -1);
        }
        
        // Tentar fazer parse da parte principal
        let mainData;
        try {
            mainData = JSON.parse(cleanBeforeRanking);
        } catch (parseError) {
            console.log(`❌ Erro ao fazer parse da parte principal: ${parseError.message}`);
            return false;
        }
        
        // Extrair o rankingAcademias usando uma abordagem mais robusta
        const rankingStartIndex = afterRankingStart.indexOf('[');
        if (rankingStartIndex === -1) {
            console.log(`❌ Não foi possível encontrar o início do array rankingAcademias`);
            return false;
        }
        
        // Encontrar o final do array usando contagem de colchetes
        let bracketCount = 0;
        let endIndex = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = rankingStartIndex; i < afterRankingStart.length; i++) {
            const char = afterRankingStart[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"') {
                inString = !inString;
                continue;
            }
            
            if (!inString) {
                if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        endIndex = i + 1;
                        break;
                    }
                }
            }
        }
        
        if (endIndex === -1) {
            console.log(`❌ Não foi possível encontrar o final do array rankingAcademias`);
            return false;
        }
        
        const rankingJsonStr = afterRankingStart.substring(rankingStartIndex, endIndex);
        
        try {
            const rankingData = JSON.parse(rankingJsonStr);
            const normalizedRanking = normalizeRankingAcademias(rankingData);
            
            // Reescrever o arquivo com dados normalizados + ranking normalizado
            const newContent = JSON.stringify(mainData, null, 2) + '\n\n"rankingAcademias":' + JSON.stringify(normalizedRanking, null, 2);
            fs.writeFileSync(filePath, newContent, 'utf8');
            
            console.log(`✅ Sucesso! Ranking de academias normalizado`);
            return true;
            
        } catch (rankingError) {
            console.log(`❌ Erro ao processar rankingAcademias: ${rankingError.message}`);
            console.log(`🔍 JSON extraído: ${rankingJsonStr.substring(0, 200)}...`);
            return false;
        }
        
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