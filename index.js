const Discord = require('discord.js');

const BOT_TOKEN = '비공개';

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Discord.Partials.Message, Discord.Partials.Channel, Discord.Partials.Reaction]
});

const CONFIG = {
    ticketCategory: '티켓',
    logChannel: 'bot-logs',
    welcomeChannel: 'welcome', // 입장 메시지 채널
    filterWords: ['욕설1', '욕설2', '광고'],
    maxWarnings: 3,
    verifiedRoleName: '인증됨',
    minAccountAge: 7 // 최소 계정 생성일 (일)
};

const data = {
    tickets: new Map(),
    warnings: new Map(),
    roleReactions: new Map(),
    verifiedUsers: new Set(),
    guildSettings: new Map(),
    userLevels: new Map(), // 레벨 시스템
    userMessages: new Map() // 메시지 카운트
};

client.once('ready', async () => {
    console.log(`${client.user.tag} 봇이 온라인입니다!`);
    client.user.setActivity('여러분을 지키는 중', { type: Discord.ActivityType.Playing });

    const commands = [
        {
            name: '도움말',
            description: '봇의 모든 명령어를 확인합니다'
        },
        {
            name: '로그설정',
            description: '로그 채널을 설정합니다',
            options: [
                {
                    name: '종류',
                    description: '로그 종류',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '전체 로그', value: 'all' },
                        { name: '멤버 로그', value: 'member' },
                        { name: '메시지 로그', value: 'message' },
                        { name: '서버 로그', value: 'server' }
                    ]
                },
                {
                    name: '채널',
                    description: '로그를 기록할 채널',
                    type: 7,
                    required: false
                }
            ]
        },
        {
            name: '레벨설정',
            description: '레벨 시스템을 켜거나 끕니다',
            options: [
                {
                    name: '상태',
                    description: '켜기/끄기',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '켜기', value: 'on' },
                        { name: '끄기', value: 'off' }
                    ]
                }
            ]
        },
        {
            name: '레벨',
            description: '자신 또는 다른 유저의 레벨을 확인합니다',
            options: [
                {
                    name: '유저',
                    description: '확인할 유저 (미입력 시 본인)',
                    type: 6,
                    required: false
                }
            ]
        },
        {
            name: '순위',
            description: '서버 레벨 순위를 확인합니다'
        },
        {
            name: '청소',
            description: '메시지를 삭제합니다',
            options: [
                {
                    name: '개수',
                    description: '삭제할 메시지 개수 (1-100)',
                    type: 4,
                    required: true
                }
            ]
        },
        {
            name: '공지',
            description: '공지사항을 전송합니다',
            options: [
                {
                    name: '내용',
                    description: '공지 내용',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: '투표',
            description: '투표를 생성합니다',
            options: [
                {
                    name: '질문',
                    description: '투표 질문',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: '유저정보',
            description: '유저 정보를 확인합니다',
            options: [
                {
                    name: '유저',
                    description: '확인할 유저 (미입력 시 본인)',
                    type: 6,
                    required: false
                }
            ]
        },
        {
            name: '서버정보',
            description: '서버 정보를 확인합니다'
        },
        {
            name: '인증설정',
            description: '인증 패널을 생성합니다'
        },
        {
            name: '티켓설정',
            description: '티켓 생성 패널을 만듭니다'
        },
        {
            name: '티켓닫기',
            description: '현재 티켓을 닫습니다'
        },
        {
            name: '경고',
            description: '유저에게 경고를 부여합니다',
            options: [
                {
                    name: '유저',
                    description: '경고를 부여할 유저',
                    type: 6,
                    required: true
                },
                {
                    name: '사유',
                    description: '경고 사유',
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: '경고확인',
            description: '유저의 경고 내역을 확인합니다',
            options: [
                {
                    name: '유저',
                    description: '확인할 유저 (미입력 시 본인)',
                    type: 6,
                    required: false
                }
            ]
        },
        {
            name: '경고초기화',
            description: '유저의 경고를 초기화합니다',
            options: [
                {
                    name: '유저',
                    description: '초기화할 유저',
                    type: 6,
                    required: true
                }
            ]
        },
        {
            name: '역할설정',
            description: '역할 선택 패널을 생성합니다'
        },
        {
            name: '필터',
            description: '욕설 필터를 관리합니다',
            options: [
                {
                    name: '작업',
                    description: '수행할 작업',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '추가', value: 'add' },
                        { name: '제거', value: 'remove' },
                        { name: '목록', value: 'list' }
                    ]
                },
                {
                    name: '단어',
                    description: '추가/제거할 단어',
                    type: 3,
                    required: false
                }
            ]
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('슬래시 명령어가 등록되었습니다!');
    } catch (error) {
        console.error('명령어 등록 실패:', error);
    }
});

// 멤버 입장 로그
client.on('guildMemberAdd', async member => {
    const guild = member.guild;
    const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    
    // 로그 채널에 입장 기록
    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📥 새로운 멤버 입장')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: '👤 유저', value: `${member.user.tag}\n${member.user}`, inline: true },
            { name: '🆔 ID', value: member.user.id, inline: true },
            { name: '📅 계정 생성일', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '⏱️ 계정 나이', value: `${Math.floor(accountAge)}일`, inline: true },
            { name: '👥 총 멤버 수', value: `${guild.memberCount}명`, inline: true }
        )
        .setFooter({ text: `입장 시간` })
        .setTimestamp();

    if (accountAge < CONFIG.minAccountAge) {
        logEmbed.addFields({ name: '⚠️ 경고', value: `계정 생성일이 ${CONFIG.minAccountAge}일 미만입니다.` });
    }

    await logAction(guild, 'member', '멤버 입장', null, logEmbed);

    // 환영 메시지 (선택사항)
    const welcomeChannel = guild.channels.cache.find(c => c.name === CONFIG.welcomeChannel);
    if (welcomeChannel) {
        const welcomeEmbed = new Discord.EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎉 환영합니다!')
            .setDescription(`${member} 님, **${guild.name}**에 오신 것을 환영합니다!`)
            .addFields(
                { name: '📋 시작하기', value: '인증을 완료하고 서버를 즐겨보세요!' },
                { name: '👥 멤버', value: `당신은 **${guild.memberCount}번째** 멤버입니다!` }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: guild.name })
            .setTimestamp();

        await welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
    }
});

// 멤버 퇴장 로그
client.on('guildMemberRemove', async member => {
    const guild = member.guild;
    const joinedDuration = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);

    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('📤 멤버 퇴장')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: '👤 유저', value: `${member.user.tag}`, inline: true },
            { name: '🆔 ID', value: member.user.id, inline: true },
            { name: '📅 계정 생성일', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '⏱️ 서버 체류 기간', value: `${Math.floor(joinedDuration)}일`, inline: true },
            { name: '👥 남은 멤버 수', value: `${guild.memberCount}명`, inline: true }
        )
        .setFooter({ text: `퇴장 시간` })
        .setTimestamp();

    await logAction(guild, 'member', '멤버 퇴장', null, logEmbed);
});

// 메시지 삭제 로그
client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;

    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🗑️ 메시지 삭제')
        .addFields(
            { name: '👤 작성자', value: message.author ? `${message.author.tag}\n${message.author}` : '알 수 없음', inline: true },
            { name: '📍 채널', value: `${message.channel}`, inline: true },
            { name: '💬 내용', value: message.content || '*내용 없음 (임베드/파일)*' }
        )
        .setFooter({ text: `메시지 ID: ${message.id}` })
        .setTimestamp();

    if (message.attachments.size > 0) {
        logEmbed.addFields({ name: '📎 첨부파일', value: `${message.attachments.size}개` });
    }

    await logAction(message.guild, 'message', '메시지 삭제', null, logEmbed);
});

// 메시지 수정 로그
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#ffd93d')
        .setTitle('✏️ 메시지 수정')
        .addFields(
            { name: '👤 작성자', value: `${oldMessage.author.tag}\n${oldMessage.author}`, inline: true },
            { name: '📍 채널', value: `${oldMessage.channel}`, inline: true },
            { name: '📝 수정 전', value: oldMessage.content || '*내용 없음*' },
            { name: '📝 수정 후', value: newMessage.content || '*내용 없음*' },
            { name: '🔗 바로가기', value: `[메시지로 이동](${newMessage.url})` }
        )
        .setFooter({ text: `메시지 ID: ${newMessage.id}` })
        .setTimestamp();

    await logAction(oldMessage.guild, 'message', '메시지 수정', null, logEmbed);
});

// 멤버 역할 변경 로그
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (addedRoles.size > 0 || removedRoles.size > 0) {
        const logEmbed = new Discord.EmbedBuilder()
            .setColor('#a29bfe')
            .setTitle('🎭 역할 변경')
            .setThumbnail(newMember.user.displayAvatarURL())
            .addFields(
                { name: '👤 대상', value: `${newMember.user.tag}\n${newMember}`, inline: true }
            )
            .setTimestamp();

        if (addedRoles.size > 0) {
            logEmbed.addFields({ 
                name: '✅ 추가된 역할', 
                value: addedRoles.map(r => r.toString()).join(', ') 
            });
        }

        if (removedRoles.size > 0) {
            logEmbed.addFields({ 
                name: '❌ 제거된 역할', 
                value: removedRoles.map(r => r.name).join(', ') 
            });
        }

        await logAction(newMember.guild, 'member', '역할 변경', null, logEmbed);
    }

    // 닉네임 변경 로그
    if (oldMember.nickname !== newMember.nickname) {
        const logEmbed = new Discord.EmbedBuilder()
            .setColor('#74b9ff')
            .setTitle('📝 닉네임 변경')
            .setThumbnail(newMember.user.displayAvatarURL())
            .addFields(
                { name: '👤 대상', value: `${newMember.user.tag}\n${newMember}`, inline: true },
                { name: '이전 닉네임', value: oldMember.nickname || '*없음*', inline: true },
                { name: '새 닉네임', value: newMember.nickname || '*없음*', inline: true }
            )
            .setTimestamp();

        await logAction(newMember.guild, 'member', '닉네임 변경', null, logEmbed);
    }
});

// 채널 생성 로그
client.on('channelCreate', async channel => {
    if (!channel.guild) return;

    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#55efc4')
        .setTitle('➕ 채널 생성')
        .addFields(
            { name: '📍 채널', value: `${channel}`, inline: true },
            { name: '🆔 ID', value: channel.id, inline: true },
            { name: '📁 타입', value: channel.type === 0 ? '텍스트' : channel.type === 2 ? '음성' : '기타', inline: true }
        )
        .setTimestamp();

    await logAction(channel.guild, 'server', '채널 생성', null, logEmbed);
});

// 채널 삭제 로그
client.on('channelDelete', async channel => {
    if (!channel.guild) return;

    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#ff7675')
        .setTitle('➖ 채널 삭제')
        .addFields(
            { name: '📍 채널명', value: channel.name, inline: true },
            { name: '🆔 ID', value: channel.id, inline: true },
            { name: '📁 타입', value: channel.type === 0 ? '텍스트' : channel.type === 2 ? '음성' : '기타', inline: true }
        )
        .setTimestamp();

    await logAction(channel.guild, 'server', '채널 삭제', null, logEmbed);
});

// 채널 수정 로그
client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (!oldChannel.guild) return;

    const changes = [];
    
    if (oldChannel.name !== newChannel.name) {
        changes.push(`**이름:** ${oldChannel.name} → ${newChannel.name}`);
    }
    
    if (oldChannel.topic !== newChannel.topic) {
        changes.push(`**주제:** ${oldChannel.topic || '*없음*'} → ${newChannel.topic || '*없음*'}`);
    }

    if (changes.length > 0) {
        const logEmbed = new Discord.EmbedBuilder()
            .setColor('#fdcb6e')
            .setTitle('✏️ 채널 수정')
            .addFields(
                { name: '📍 채널', value: `${newChannel}`, inline: true },
                { name: '🆔 ID', value: newChannel.id, inline: true },
                { name: '🔄 변경사항', value: changes.join('\n') }
            )
            .setTimestamp();

        await logAction(newChannel.guild, 'server', '채널 수정', null, logEmbed);
    }
});

// 밴 로그
client.on('guildBanAdd', async ban => {
    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#2d3436')
        .setTitle('🔨 멤버 차단')
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: '👤 차단된 유저', value: `${ban.user.tag}`, inline: true },
            { name: '🆔 ID', value: ban.user.id, inline: true },
            { name: '📝 사유', value: ban.reason || '*사유 없음*' }
        )
        .setTimestamp();

    await logAction(ban.guild, 'server', '멤버 차단', null, logEmbed);
});

// 밴 해제 로그
client.on('guildBanRemove', async ban => {
    const logEmbed = new Discord.EmbedBuilder()
        .setColor('#00b894')
        .setTitle('✅ 차단 해제')
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: '👤 해제된 유저', value: `${ban.user.tag}`, inline: true },
            { name: '🆔 ID', value: ban.user.id, inline: true }
        )
        .setTimestamp();

    await logAction(ban.guild, 'server', '차단 해제', null, logEmbed);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const filtered = CONFIG.filterWords.some(word => 
        message.content.toLowerCase().includes(word.toLowerCase())
    );
    
    if (filtered) {
        await message.delete().catch(() => {});
        const warning = await message.channel.send(`⚠️ ${message.author}, 부적절한 단어가 감지되어 메시지가 삭제되었습니다.`);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
        await addWarning(message.guild, message.author, '자동 필터링: 부적절한 언어 사용');
        await logAction(message.guild, 'message', '필터링', `${message.author.tag}의 메시지가 필터링됨`);
    }

    // 레벨 시스템
    const settings = data.guildSettings.get(message.guild.id);
    if (settings && settings.levelSystemEnabled) {
        const userId = message.author.id;
        const guildId = message.guild.id;
        const key = `${guildId}-${userId}`;
        let userData = data.userLevels.get(key) || { level: 1, xp: 0, messages: 0 };

        userData.messages += 1;
        userData.xp += Math.floor(Math.random() * 10) + 5; // 5-15 XP 랜덤

        const xpNeeded = userData.level * 100;
        if (userData.xp >= xpNeeded) {
            userData.level += 1;
            userData.xp -= xpNeeded;
            await message.channel.send(`🎉 ${message.author}, 레벨 ${userData.level}로 상승했습니다!`);
        }

        data.userLevels.set(key, userData);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        // 관리자 권한 체크 (인증하기 제외)
        if (interaction.commandName !== '도움말') {
            if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
                return interaction.reply({ 
                    content: '❌ 이 명령어는 관리자만 사용할 수 있습니다!', 
                    ephemeral: true 
                });
            }
        }

        try {
            switch(interaction.commandName) {
                case '도움말':
                    await showHelp(interaction);
                    break;
                case '로그설정':
                    await setupLogChannel(interaction);
                    break;
                case '레벨설정':
                    await setupLevelSystem(interaction);
                    break;
                case '레벨':
                    await checkLevel(interaction);
                    break;
                case '순위':
                    await showLeaderboard(interaction);
                    break;
                case '청소':
                    await clearMessages(interaction);
                    break;
                case '공지':
                    await sendAnnouncement(interaction);
                    break;
                case '투표':
                    await createPoll(interaction);
                    break;
                case '유저정보':
                    await showUserInfo(interaction);
                    break;
                case '서버정보':
                    await showServerInfo(interaction);
                    break;
                case '인증설정':
                    await setupVerificationPanel(interaction);
                    break;
                case '티켓설정':
                    await setupTicketPanel(interaction);
                    break;
                case '티켓닫기':
                    await closeTicket(interaction);
                    break;
                case '경고':
                    await warnUser(interaction);
                    break;
                case '경고확인':
                    await showWarnings(interaction);
                    break;
                case '경고초기화':
                    await clearWarnings(interaction);
                    break;
                case '역할설정':
                    await setupRolePanel(interaction);
                    break;
                case '필터':
                    await manageFilter(interaction);
                    break;
            }
        } catch (error) {
            console.error('명령어 처리 오류:', error);
            const reply = { content: '❌ 명령어 처리 중 오류가 발생했습니다.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'verify_button') {
            await handleVerification(interaction);
        } else if (interaction.customId === 'create_ticket') {
            await createTicket(interaction);
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'role_select') {
            await handleRoleSelection(interaction);
        }
    }
});

async function showHelp(interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 봇 명령어 도움말')
        .setDescription('사용 가능한 모든 명령어입니다.')
        .addFields(
            { name: '📊 로그 시스템', value: '`/로그설정` - 로그 채널 설정 (종류별)' },
            { name: '⭐ 레벨 시스템', value: '`/레벨설정` - 레벨 시스템 켜기/끄기\n`/레벨` - 레벨 확인\n`/순위` - 레벨 순위표' },
            { name: '🛠️ 관리 기능', value: '`/청소` - 메시지 삭제\n`/공지` - 공지사항 전송\n`/투표` - 투표 생성' },
            { name: '📌 정보 기능', value: '`/유저정보` - 유저 정보 확인\n`/서버정보` - 서버 정보 확인' },
            { name: '✅ 인증 시스템', value: '`/인증설정` - 인증 패널 생성' },
            { name: '🎫 티켓 시스템', value: '`/티켓설정` - 티켓 패널 생성\n`/티켓닫기` - 티켓 닫기' },
            { name: '⚠️ 경고 시스템', value: '`/경고` - 경고 부여\n`/경고확인` - 경고 확인\n`/경고초기화` - 경고 초기화' },
            { name: '🎭 역할 시스템', value: '`/역할설정` - 역할 선택 패널' },
            { name: '🔍 필터링', value: '`/필터` - 욕설 필터 관리' }
        )
        .setFooter({ text: '대부분의 명령어는 관리자 권한이 필요합니다.' });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function setupLogChannel(interaction) {
    const type = interaction.options.getString('종류');
    let channel = interaction.options.getChannel('채널');

    await interaction.deferReply({ ephemeral: true });

    if (!channel) {
        const channelNames = {
            'all': '수박봇-전체로그',
            'member': '수박봇-입퇴장로그',
            'message': '수박봇-메시지로그',
            'server': '수박봇-서버로그'
        };

        const name = channelNames[type];
        channel = interaction.guild.channels.cache.find(c => c.name === name);
        
        if (!channel) {
            channel = await interaction.guild.channels.create({
                name,
                type: Discord.ChannelType.GuildText,
                permissionOverwrites: [{
                    id: interaction.guild.id,
                    deny: [Discord.PermissionFlagsBits.ViewChannel]
                }]
            });
        }
    }

    const settings = data.guildSettings.get(interaction.guild.id) || {};
    settings[`${type}LogChannel`] = channel.id;
    data.guildSettings.set(interaction.guild.id, settings);

    const typeNames = {
        'all': '전체',
        'member': '입퇴장',
        'message': '메시지',
        'server': '서버'
    };

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ 로그 채널 설정 완료')
        .setDescription(`**${typeNames[type]} 로그**가 ${channel}에 기록됩니다!`);

    await interaction.editReply({ embeds: [embed] });
    await channel.send({ embeds: [new Discord.EmbedBuilder().setColor('#5865F2').setTitle('📝 로그 시스템 활성화').setDescription(`이 채널에 ${typeNames[type]} 로그가 기록됩니다.`).setTimestamp()] });
}

async function setupVerificationPanel(interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ 서버 인증')
        .setDescription('아래 버튼을 클릭하여 서버 인증을 완료하세요!')
        .addFields(
            { name: '📋 인증 조건', value: `• 계정 생성일: ${CONFIG.minAccountAge}일 이상\n• 서버 규칙 동의\n• 봇이 아닌 실제 사용자` },
            { name: '🎁 인증 혜택', value: '• 전체 채널 접근\n• 채팅 및 음성 참여\n• 서버 활동 참여' }
        )
        .setFooter({ text: '인증 버튼을 눌러 시작하세요!' });

    const button = new Discord.ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel('✅ 인증하기')
        .setStyle(Discord.ButtonStyle.Success);

    const row = new Discord.ActionRowBuilder().addComponents(button);

    await interaction.reply({ content: '✅ 인증 패널이 생성되었습니다!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
}

async function handleVerification(interaction) {
    const user = interaction.user;
    const member = interaction.member;
    const guild = interaction.guild;

    if (data.verifiedUsers.has(user.id)) {
        return interaction.reply({ content: '✅ 이미 인증이 완료되었습니다!', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // 관리자 권한 확인
    const isAdmin = member.permissions.has(Discord.PermissionFlagsBits.Administrator);

    // 계정 생성일 확인 (관리자는 통과)
    if (!isAdmin) {
        const accountAge = (Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountAge < CONFIG.minAccountAge) {
            const embed = new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ 인증 실패')
                .setDescription(`계정 생성일이 ${CONFIG.minAccountAge}일 미만입니다.`)
                .addFields(
                    { name: '계정 생성일', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` },
                    { name: '필요 조건', value: `${CONFIG.minAccountAge}일 이상` }
                )
                .setFooter({ text: '새 계정은 보안상 인증이 제한됩니다.' });
            
            return interaction.editReply({ embeds: [embed] });
        }
    }

    // 인증 역할 찾기 또는 생성
    let verifiedRole = guild.roles.cache.find(r => r.name === CONFIG.verifiedRoleName);
    if (!verifiedRole) {
        verifiedRole = await guild.roles.create({
            name: CONFIG.verifiedRoleName,
            color: '#00ff00',
            reason: '인증 시스템 역할'
        });
    }

    // 역할 부여
    await member.roles.add(verifiedRole);
    data.verifiedUsers.add(user.id);

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ 인증 완료!')
        .setDescription('서버 인증이 완료되었습니다.')
        .addFields(
            { name: '부여된 역할', value: verifiedRole.toString() },
            { name: '계정 생성일', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` },
            { name: '서버 가입일', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` }
        );

    if (isAdmin) {
        embed.addFields({ name: '🛡️ 관리자', value: '관리자 권한으로 자동 인증되었습니다.' });
    }

    embed.setFooter({ text: '서버 규칙을 준수해주세요!' }).setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await logAction(guild, '인증 완료', `${user.tag}이(가) 서버 인증을 완료했습니다.`);
}

async function setupRolePanel(interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎭 역할 선택')
        .setDescription('아래 메뉴에서 원하는 역할을 선택하세요!')
        .addFields(
            { name: '🎮 게이머', value: '게임 관련 채널 접근' },
            { name: '🎨 아티스트', value: '창작 활동 채널 접근' },
            { name: '💻 개발자', value: '개발 관련 채널 접근' },
            { name: '🎵 음악', value: '음악 관련 채널 접근' },
            { name: '📚 학생', value: '학습 관련 채널 접근' }
        )
        .setFooter({ text: '여러 역할을 선택할 수 있습니다!' });

    const selectMenu = new Discord.StringSelectMenuBuilder()
        .setCustomId('role_select')
        .setPlaceholder('역할을 선택하세요')
        .setMinValues(0)
        .setMaxValues(5)
        .addOptions([
            {
                label: '게이머',
                description: '게임 관련 역할',
                value: '게이머',
                emoji: '🎮'
            },
            {
                label: '아티스트',
                description: '창작 활동 역할',
                value: '아티스트',
                emoji: '🎨'
            },
            {
                label: '개발자',
                description: '개발 관련 역할',
                value: '개발자',
                emoji: '💻'
            },
            {
                label: '음악',
                description: '음악 관련 역할',
                value: '음악',
                emoji: '🎵'
            },
            {
                label: '학생',
                description: '학습 관련 역할',
                value: '학생',
                emoji: '📚'
            }
        ]);

    const row = new Discord.ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ content: '✅ 역할 선택 패널이 생성되었습니다!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
}

async function handleRoleSelection(interaction) {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const guild = interaction.guild;

    const allRoleNames = ['게이머', '아티스트', '개발자', '음악', '학생'];
    const addedRoles = [];
    const removedRoles = [];

    for (const roleName of allRoleNames) {
        let role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
            role = await guild.roles.create({
                name: roleName,
                reason: '역할 선택 시스템'
            });
        }

        if (selectedRoles.includes(roleName)) {
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                addedRoles.push(roleName);
            }
        } else {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                removedRoles.push(roleName);
            }
        }
    }

    let description = '';
    if (addedRoles.length > 0) {
        description += `✅ **추가된 역할:** ${addedRoles.join(', ')}\n`;
    }
    if (removedRoles.length > 0) {
        description += `❌ **제거된 역할:** ${removedRoles.join(', ')}\n`;
    }
    if (addedRoles.length === 0 && removedRoles.length === 0) {
        description = '변경된 역할이 없습니다.';
    }

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎭 역할 업데이트')
        .setDescription(description)
        .setFooter({ text: '언제든지 역할을 변경할 수 있습니다!' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    if (addedRoles.length > 0 || removedRoles.length > 0) {
        await logAction(guild, '역할 변경', `${interaction.user.tag}이(가) 역할을 변경했습니다.\n추가: ${addedRoles.join(', ') || '없음'}\n제거: ${removedRoles.join(', ') || '없음'}`);
    }
}

async function setupTicketPanel(interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎫 티켓 생성')
        .setDescription('아래 버튼을 클릭하여 티켓을 생성하세요!\n관리자가 곧 응답할 것입니다.')
        .setFooter({ text: '티켓은 문의사항이나 문제 신고 시 사용하세요.' });

    const button = new Discord.ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('🎫 티켓 생성하기')
        .setStyle(Discord.ButtonStyle.Primary);

    const row = new Discord.ActionRowBuilder().addComponents(button);

    await interaction.reply({ content: '✅ 티켓 패널이 생성되었습니다!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
}

async function createTicket(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;
    
    const existingTicket = Array.from(data.tickets.values()).find(t => t.userId === user.id);
    if (existingTicket) {
        const channel = guild.channels.cache.get(existingTicket.channelId);
        if (channel) {
            return interaction.reply({ content: `❌ 이미 티켓이 있습니다: ${channel}`, ephemeral: true });
        }
    }

    await interaction.deferReply({ ephemeral: true });

    const ticketId = `ticket-${user.username}-${Date.now()}`.substring(0, 50);
    
    let category = guild.channels.cache.find(c => c.name === CONFIG.ticketCategory && c.type === Discord.ChannelType.GuildCategory);
    
    if (!category) {
        category = await guild.channels.create({
            name: CONFIG.ticketCategory,
            type: Discord.ChannelType.GuildCategory
        });
    }

    const ticketChannel = await guild.channels.create({
        name: ticketId,
        type: Discord.ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            { id: guild.id, deny: [Discord.PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [Discord.PermissionFlagsBits.ViewChannel, Discord.PermissionFlagsBits.SendMessages] }
        ]
    });

    data.tickets.set(ticketChannel.id, { userId: user.id, createdAt: Date.now(), channelId: ticketChannel.id });

    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎫 티켓이 생성되었습니다')
        .setDescription(`${user}님의 티켓입니다.\n관리자가 곧 응답할 것입니다.`)
        .addFields({ name: '📝 안내', value: '문의사항을 자세히 설명해주세요.\n티켓을 닫으려면 `/티켓닫기` 명령어를 사용하세요.' })
        .setTimestamp();

    await ticketChannel.send({ content: `${user}`, embeds: [embed] });
    await interaction.editReply({ content: `✅ 티켓이 생성되었습니다: ${ticketChannel}` });
    await logAction(guild, '티켓 생성', `${user.tag}이(가) 티켓을 생성했습니다.`);
}

async function closeTicket(interaction) {
    if (!data.tickets.has(interaction.channel.id)) {
        return interaction.reply({ content: '❌ 이 채널은 티켓이 아닙니다.', ephemeral: true });
    }

    const embed = new Discord.EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔒 티켓 닫기')
        .setDescription('5초 후 이 티켓이 삭제됩니다...');

    await interaction.reply({ embeds: [embed] });
    await logAction(interaction.guild, '티켓 닫기', `${interaction.user.tag}이(가) 티켓을 닫았습니다.`);
    
    data.tickets.delete(interaction.channel.id);
    setTimeout(async () => { await interaction.channel.delete(); }, 5000);
}

async function warnUser(interaction) {
    const user = interaction.options.getUser('유저');
    const reason = interaction.options.getString('사유') || '사유 없음';

    await addWarning(interaction.guild, user, reason, interaction.user);

    const embed = new Discord.EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('⚠️ 경고 발급')
        .setDescription(`${user}님에게 경고가 발급되었습니다.`)
        .addFields({ name: '사유', value: reason });

    await interaction.reply({ embeds: [embed] });
}

async function addWarning(guild, user, reason, moderator = null) {
    const key = `${guild.id}-${user.id}`;
    const warnings = data.warnings.get(key) || [];
    
    warnings.push({ reason, moderator: moderator ? moderator.tag : 'System', date: Date.now() });
    data.warnings.set(key, warnings);

    const warnCount = warnings.length;
    await logAction(guild, '경고', `${user.tag}에게 경고 발급 (${warnCount}/${CONFIG.maxWarnings})\n사유: ${reason}`);

    if (warnCount >= CONFIG.maxWarnings) {
        const member = await guild.members.fetch(user.id);
        if (member) {
            await member.timeout(3600000, `${CONFIG.maxWarnings}회 경고 누적`).catch(() => {});
            await logAction(guild, '자동 제재', `${user.tag}이(가) ${CONFIG.maxWarnings}회 경고로 1시간 타임아웃되었습니다.`);
        }
    }
}

async function showWarnings(interaction) {
    const user = interaction.options.getUser('유저') || interaction.user;
    const key = `${interaction.guild.id}-${user.id}`;
    const warnings = data.warnings.get(key) || [];

    const embed = new Discord.EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle(`⚠️ ${user.username}의 경고 내역`)
        .setDescription(warnings.length === 0 ? '경고 내역이 없습니다.' : `총 ${warnings.length}개의 경고`);

    warnings.slice(-5).forEach((warn, i) => {
        const date = new Date(warn.date).toLocaleString('ko-KR');
        embed.addFields({ name: `경고 #${warnings.length - 5 + i + 1}`, value: `사유: ${warn.reason}\n담당자: ${warn.moderator}\n날짜: ${date}` });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function clearWarnings(interaction) {
    const user = interaction.options.getUser('유저');
    const key = `${interaction.guild.id}-${user.id}`;
    data.warnings.delete(key);

    await interaction.reply({ content: `✅ ${user}의 모든 경고가 초기화되었습니다.` });
    await logAction(interaction.guild, '경고 초기화', `${interaction.user.tag}이(가) ${user.tag}의 경고를 초기화했습니다.`);
}

async function manageFilter(interaction) {
    const action = interaction.options.getString('작업');
    const word = interaction.options.getString('단어');

    switch(action) {
        case 'add':
            if (!word) return interaction.reply({ content: '❌ 추가할 단어를 입력하세요.', ephemeral: true });
            CONFIG.filterWords.push(word);
            await interaction.reply({ content: `✅ "${word}"이(가) 필터에 추가되었습니다.` });
            await logAction(interaction.guild, '필터 추가', `${interaction.user.tag}이(가) "${word}"를 필터에 추가했습니다.`);
            break;
        
        case 'remove':
            if (!word) return interaction.reply({ content: '❌ 제거할 단어를 입력하세요.', ephemeral: true });
            const index = CONFIG.filterWords.indexOf(word);
            if (index > -1) {
                CONFIG.filterWords.splice(index, 1);
                await interaction.reply({ content: `✅ "${word}"이(가) 필터에서 제거되었습니다.` });
                await logAction(interaction.guild, '필터 제거', `${interaction.user.tag}이(가) "${word}"를 필터에서 제거했습니다.`);
            } else {
                await interaction.reply({ content: '❌ 해당 단어가 필터에 없습니다.', ephemeral: true });
            }
            break;
        
        case 'list':
            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔍 필터링 단어 목록')
                .setDescription(CONFIG.filterWords.length > 0 ? CONFIG.filterWords.join(', ') : '필터링 단어가 없습니다.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}

async function logAction(guild, logType, action, description, customEmbed = null) {
    const settings = data.guildSettings.get(guild.id);
    let logChannel;

    // 로그 타입별 채널 찾기
    if (settings) {
        // member: 입퇴장, message: 메시지, server: 서버, all: 전체
        const channelId = settings[`${logType}LogChannel`] || settings['allLogChannel'];
        if (channelId) {
            logChannel = guild.channels.cache.get(channelId);
        }
    }

    if (!logChannel) return;

    if (customEmbed) {
        await logChannel.send({ embeds: [customEmbed] }).catch(() => {});
    } else {
        const embed = new Discord.EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📝 ${action}`)
            .setDescription(description)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

async function setupLevelSystem(interaction) {
    const status = interaction.options.getString('상태');
    const guildId = interaction.guild.id;
    const settings = data.guildSettings.get(guildId) || {};
    settings.levelSystemEnabled = status === 'on';
    data.guildSettings.set(guildId, settings);

    const embed = new Discord.EmbedBuilder()
        .setColor(status === 'on' ? '#00ff00' : '#ff0000')
        .setTitle(status === 'on' ? '✅ 레벨 시스템 활성화' : '❌ 레벨 시스템 비활성화')
        .setDescription(`레벨 시스템이 ${status === 'on' ? '켜졌습니다' : '꺼졌습니다'}.`);

    await interaction.reply({ embeds: [embed] });
}

async function checkLevel(interaction) {
    const user = interaction.options.getUser('유저') || interaction.user;
    const guildId = interaction.guild.id;
    const key = `${guildId}-${user.id}`;
    const userData = data.userLevels.get(key) || { level: 1, xp: 0, messages: 0 };

    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${user.username}의 레벨 정보`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '레벨', value: `${userData.level}`, inline: true },
            { name: 'XP', value: `${userData.xp}/${userData.level * 100}`, inline: true },
            { name: '메시지 수', value: `${userData.messages}`, inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

async function showLeaderboard(interaction) {
    const guildId = interaction.guild.id;
    const allUsers = Array.from(data.userLevels.entries())
        .filter(([key]) => key.startsWith(`${guildId}-`))
        .map(([key, value]) => ({ userId: key.split('-')[1], ...value }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

    const embed = new Discord.EmbedBuilder()
        .setColor('#ffd700')
        .setTitle('🏆 레벨 순위표')
        .setDescription('서버 내 레벨 TOP 10');

    for (let i = 0; i < allUsers.length; i++) {
        const user = await interaction.guild.members.fetch(allUsers[i].userId).catch(() => null);
        const username = user ? user.user.username : '알 수 없음';
        embed.addFields({
            name: `#${i + 1} ${username}`,
            value: `레벨: ${allUsers[i].level} | XP: ${allUsers[i].xp}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function clearMessages(interaction) {
    const amount = interaction.options.getInteger('개수');
    if (amount < 1 || amount > 100) {
        return interaction.reply({ content: '❌ 삭제할 메시지 개수는 1에서 100 사이여야 합니다.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const messages = await interaction.channel.bulkDelete(amount, true);
    const embed = new Discord.EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🗑️ 메시지 삭제 완료')
        .setDescription(`${messages.size}개의 메시지를 삭제했습니다.`);

    await interaction.editReply({ embeds: [embed] });
}

async function sendAnnouncement(interaction) {
    const content = interaction.options.getString('내용');
    await interaction.reply({ content: '✅ 공지가 전송되었습니다!', ephemeral: true });
    await interaction.channel.send(`📢 **공지사항**\n\n${content}`);
}

async function createPoll(interaction) {
    const question = interaction.options.getString('질문');
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📊 투표')
        .setDescription(question)
        .setFooter({ text: '아래 이모지를 클릭하여 투표하세요!' });

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    await message.react('✅');
    await message.react('❌');
}

async function showUserInfo(interaction) {
    const user = interaction.options.getUser('유저') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${user.username}의 정보`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '이름', value: user.username, inline: true },
            { name: '태그', value: user.tag, inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: '계정 생성일', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '서버 가입일', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true },
            { name: '역할', value: member ? member.roles.cache.map(r => r.name).join(', ') : 'N/A', inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

async function showServerInfo(interaction) {
    const guild = interaction.guild;
    const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${guild.name} 서버 정보`)
        .setThumbnail(guild.iconURL())
        .addFields(
            { name: '멤버 수', value: `${guild.memberCount}`, inline: true },
            { name: '채널 수', value: `${guild.channels.cache.size}`, inline: true },
            { name: '역할 수', value: `${guild.roles.cache.size}`, inline: true },
            { name: '생성일', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '부스트 레벨', value: `${guild.premiumTier}`, inline: true },
            { name: '부스트 수', value: `${guild.premiumSubscriptionCount}`, inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

client.login(BOT_TOKEN);