const fs = require('fs');
const path = require('path');

// Função para normalizar um competidor
function normalizeCompetitor(competitor) {
    const normalized = {};
    
    // Normalizar posição
    if (competitor.place !== undefined) {
        normalized.posicao = typeof competitor.place === 'string' ? 
            parseInt(competitor.place) : competitor.place;
    } else if (competitor.posicao !== undefined) {
        normalized.posicao = typeof competitor.posicao === 'string' ? 
            parseInt(competitor.posicao) : competitor.posicao;
    }
    
    // Normalizar nome
    if (competitor.name !== undefined) {
        normalized.nome = competitor.name;
    } else if (competitor.nome !== undefined) {
        normalized.nome = competitor.nome;
    } else if (competitor.athleteName !== undefined) {
        // Para arquivos world-ibjjf antigos que têm athleteName com academia
        const parts = competitor.athleteName.split('\n');
        normalized.nome = parts[0];
        if (parts.length > 1 && !competitor.academy) {
            normalized.academia = parts[1];
        }
    }
    
    // Normalizar academia
    if (competitor.academy !== undefined) {
        normalized.academia = competitor.academy;
    } else if (competitor.academia !== undefined) {
        normalized.academia = competitor.academia;
    }
    
    return normalized;
}

// Função para normalizar uma categoria
function normalizeCategory(category) {
    const normalized = {};
    
    // Normalizar nome da categoria
    if (category.category !== undefined) {
        normalized.categoria = category.category;
    } else if (category.categoria !== undefined) {
        normalized.categoria = category.categoria;
    }
    
    // Normalizar ranking
    if (category.ranking && Array.isArray(category.ranking)) {
        normalized.ranking = category.ranking.map(normalizeCompetitor);
    } else if (category.athleteName) {
        // Para arquivos world-ibjjf antigos sem estrutura de ranking
        normalized.ranking = [normalizeCompetitor(category)];
    }
    
    return normalized;
}

// Função para normalizar entrada do ranking de academias
function normalizeRankingEntry(entry) {
    const normalized = {};
    
    // Normalizar posição
    if (entry.place !== undefined) {
        normalized.posicao = typeof entry.place === 'string' ? 
            parseInt(entry.place) : entry.place;
    } else if (entry.posicao !== undefined) {
        normalized.posicao = typeof entry.posicao === 'string' ? 
            parseInt(entry.posicao) : entry.posicao;
    }
    
    // Normalizar nome da academia
    if (entry.name !== undefined) {
        normalized.academia = entry.name;
    } else if (entry.academia !== undefined) {
        normalized.academia = entry.academia;
    } else if (entry.academyName !== undefined) {
        normalized.academia = entry.academyName;
    }
    
    // Normalizar pontos
    if (entry.points !== undefined) {
        normalized.pontos = typeof entry.points === 'string' ? 
            parseInt(entry.points) : entry.points;
    } else if (entry.pontos !== undefined) {
        normalized.pontos = typeof entry.pontos === 'string' ? 
            parseInt(entry.pontos) : entry.pontos;
    }
    
    return normalized;
}

// Função para normalizar ranking de academias
function normalizeRankingAcademias(rankingAcademias) {
    if (!rankingAcademias || !Array.isArray(rankingAcademias)) {
        return rankingAcademias;
    }
    
    const normalized = {};
    
    for (const item of rankingAcademias) {
        if (typeof item === 'object' && item !== null) {
            // Estrutura atual: { "Masculino": [...], "Feminino": [...] }
            for (const [key, value] of Object.entries(item)) {
                if (Array.isArray(value)) {
                    normalized[key] = value.map(normalizeRankingEntry);
                } else if (typeof value === 'object' && value.ranking) {
                    // Estrutura especial de 1999
                    normalized[key] = value.ranking.map(normalizeRankingEntry);
                }
            }
        }
    }
    
    return [normalized];
}

// Função para dividir JSONs múltiplos concatenados
function splitMultipleJsons(content) {
    const jsonArrays = [];
    let currentJson = '';
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        currentJson += char;
        
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
                    try {
                        const parsed = JSON.parse(currentJson.trim());
                        jsonArrays.push(parsed);
                        currentJson = '';
                    } catch (e) {
                        // Continuar acumulando se não for JSON válido ainda
                    }
                }
            }
        }
    }
    
    return jsonArrays;
}

// Função para processar um arquivo JSON
function processJsonFile(filePath) {
    try {
        console.log(`📄 Processando: ${path.basename(filePath)}`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        let data;
        
        // Tentar parse direto primeiro
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            // Se falhar, tentar dividir JSONs múltiplos
            console.log(`🔄 Tentando dividir JSONs múltiplos...`);
            const jsonArrays = splitMultipleJsons(content);
            
            if (jsonArrays.length === 0) {
                console.log(`❌ Erro ao processar ${path.basename(filePath)}: ${parseError.message}`);
                return false;
            }
            
            // Concatenar todos os arrays
            data = [];
            for (const jsonArray of jsonArrays) {
                if (Array.isArray(jsonArray)) {
                    data = data.concat(jsonArray);
                }
            }
            
            console.log(`✅ Divididos ${jsonArrays.length} arrays JSON`);
        }
        
        if (!Array.isArray(data)) {
            console.log(`❌ Arquivo não contém array: ${path.basename(filePath)}`);
            return false;
        }
        
        // Verificar se há rankingAcademias separado
        let rankingAcademias = null;
        let mainData = data;
        
        // Procurar por rankingAcademias no conteúdo
        if (content.includes('"rankingAcademias"')) {
            const rankingIndex = content.indexOf('"rankingAcademias"');
            const beforeRanking = content.substring(0, rankingIndex);
            const afterRankingStart = content.substring(rankingIndex);
            
            // Extrair o rankingAcademias
            const rankingStartIndex = afterRankingStart.indexOf('[');
            if (rankingStartIndex !== -1) {
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
                
                if (endIndex !== -1) {
                    const rankingJsonStr = afterRankingStart.substring(rankingStartIndex, endIndex);
                    
                    try {
                        rankingAcademias = JSON.parse(rankingJsonStr);
                        
                        // Parse da parte principal (antes do rankingAcademias)
                        const mainJsonStr = beforeRanking.replace(/,\s*$/, '') + ']';
                        mainData = JSON.parse(mainJsonStr);
                        
                        console.log(`🏆 RankingAcademias encontrado e extraído`);
                    } catch (rankingError) {
                        console.log(`⚠️  Erro ao processar rankingAcademias: ${rankingError.message}`);
                    }
                }
            }
        }
        
        // Normalizar dados principais
        const normalizedData = mainData.map(normalizeCategory);
        
        // Normalizar ranking de academias se existir
        if (rankingAcademias) {
            const normalizedRanking = normalizeRankingAcademias(rankingAcademias);
            
            // Adicionar ao final do array principal
            normalizedData.push({
                rankingAcademias: normalizedRanking[0]
            });
        }
        
        // Escrever arquivo normalizado
        fs.writeFileSync(filePath, JSON.stringify(normalizedData, null, 2), 'utf8');
        
        console.log(`✅ Sucesso! Arquivo equalizado`);
        return true;
        
    } catch (error) {
        console.log(`❌ Erro ao processar ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

// Função para processar um diretório
function processDirectory(dirPath) {
    console.log(`\n📁 Processando pasta: ${dirPath}`);
    console.log('==================================================');
    
    try {
        const files = fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.json'))
            .sort();
        
        console.log(`📊 Encontrados ${files.length} arquivos JSON`);
        
        let success = 0;
        let errors = 0;
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            if (processJsonFile(filePath)) {
                success++;
            } else {
                errors++;
            }
        }
        
        console.log(`\n📈 Resultados para ${dirPath}:`);
        console.log(`✅ Sucessos: ${success}`);
        console.log(`❌ Erros: ${errors}`);
        console.log(`📊 Taxa de sucesso: ${((success / (success + errors)) * 100).toFixed(1)}%`);
        
        return { success, errors };
        
    } catch (error) {
        console.log(`❌ Erro ao processar diretório ${dirPath}: ${error.message}`);
        return { success: 0, errors: 1 };
    }
}

// Função principal
function main() {
    console.log('🚀 Iniciando equalização completa de todos os arquivos...\n');
    
    const directories = ['./brasileiro-ibjjf', './pan-ibjjf', './world-ibjjf'];
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalFiles = 0;
    
    for (const dir of directories) {
        if (fs.existsSync(dir)) {
            const result = processDirectory(dir);
            totalSuccess += result.success;
            totalErrors += result.errors;
            totalFiles += result.success + result.errors;
        } else {
            console.log(`⚠️  Diretório não encontrado: ${dir}`);
            totalErrors++;
        }
    }
    
    console.log('\n============================================================');
    console.log('🎯 RESUMO FINAL:');
    console.log(`📁 Total de arquivos processados: ${totalFiles}`);
    console.log(`✅ Total de sucessos: ${totalSuccess}`);
    console.log(`❌ Total de erros: ${totalErrors}`);
    console.log(`📊 Taxa de sucesso geral: ${((totalSuccess / totalFiles) * 100).toFixed(1)}%`);
    
    if (totalErrors === 0) {
        console.log('\n🎉 Todos os arquivos foram equalizados com sucesso!');
        console.log('📋 Estrutura padronizada aplicada:');
        console.log('   • Campos em português: categoria, posicao, nome, academia');
        console.log('   • Tipos corretos: posicao como number');
        console.log('   • RankingAcademias normalizado: posicao, academia, pontos');
    } else {
        console.log('\n⚠️  Alguns arquivos apresentaram erros.');
        console.log('💡 Verifique os logs acima para mais detalhes.');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

// Exportar funções para uso externo
module.exports = {
    processJsonFile,
    processDirectory,
    main
};