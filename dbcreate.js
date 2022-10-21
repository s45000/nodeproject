var mysql = require('mysql');
var crypto = require('crypto');

//DB에 연결할 옵션들
var option = {
	host : 'localhost',
	port : 3306,
	user: 'root',
	password: '1311',
	database: 'SeoJ'
};

//database 연결
var client = mysql.createConnection(option);
client.connect();
//accounts table 생성
var Cacc = 'CREATE TABLE accounts ( ';
Cacc += 'N int(11) not null auto_increment primary key,';
Cacc += 'id varchar(50) not null,';
Cacc += 'pwhasy varchar(200) not null,';
Cacc += 'nickname varchar(20) not null,';
Cacc += 'QuizPoint int(11) default 0,';
Cacc += 'OmokPoint int(11) default 0,';
Cacc += 'ingameQpoint int(10) default 0 );';

client.query(Cacc);
//운영자 계정 생성
var id = 'seojung8208';
var pwd = 'as1234';
var nickname = '운영자';
	var shasum = crypto.createHash('sha256');
	shasum.update(pwd);
	var pwdhasy = shasum.digest('hex');
client.query('INSERT INTO accounts (id, pwhasy, nickname) VALUES (?, ?, ?)',[id, pwdhasy, nickname]);

//Quizs table 생성
var Cuiz = 'CREATE TABLE Quizs ( ';
Cuiz += 'N int(11) not null auto_increment primary key,';
Cuiz += 'Question varchar(70) not null,';
Cuiz += 'Answer varchar(10) not null,';
Cuiz += 'Genre varchar(10) not null,';
Cuiz += 'Permisson int(1) default 0 );';

client.query(Cuiz);
//Quiz들 생성
var Qset = "INSERT INTO Quizs (Question, Answer, Genre, Permisson) VALUES";
Qset += "('소 잃고','외양간 고친다','proverb',1),";
Qset += "('가는말이 고와야','오는말이 곱다','proverb',1),";
Qset += "('ㅅㅍㅇㄷㅁ','스파이더맨','initial',1),";
Qset += "('5가 제일 무서워하는 집은?','오페라하우스','nonsense',1),";
Qset += "('임진왜란이 발생한 년도는?','1592','history',1),";
Qset += "('외교담판으로 강동6주를 얻은사람은?','서희','history',1),";
Qset += "('파우스트의 저자는?','괴테','literature',1),";
Qset += "('돈키호테의 종자의 이름은?','산쵸','literature',1);";
client.query(Qset);

//QuizRooms table 생성
var Cqrm = 'CREATE TABLE QuizRooms (';
Cqrm += 'N int(11) not null auto_increment primary key,';
Cqrm += 'name varchar(50) not null,';
Cqrm += 'genre varchar(10) not null,';
Cqrm += 'quest int(10) not null,';
Cqrm += 'people int(10) default 0,';
Cqrm += 'seat int(10) default 6,';
Cqrm += 'playing int(2) default 0 );';

client.query(Cqrm);

//OmokRooms table 생성
var Corm = 'CREATE TABLE OmokRooms (';
Corm += 'N int(11) not null auto_increment primary key,';
Corm += 'name varchar(50) not null,';
Corm += 'people int(10) default 0,';
Corm += 'seat int(10) default 2,';
Corm += 'playing int(2) default 0 );';

client.query(Corm);