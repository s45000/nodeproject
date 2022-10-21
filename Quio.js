var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var crypto = require('crypto');
var cookieParser = require('cookie-parser');
var ejs = require('ejs');
var socketio = require('socket.io');
var http = require('http');

//cookie값없을때 로그인창으로 가도록하기
var app = express();
app.setMaxListeners(20);//리스너제한증가

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

//bodyparser 사용
app.use(bodyParser.urlencoded({ extended: false}));
//cookie-parser 사용
app.use(cookieParser());

//ejs형식 사용
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

//socketio 사용하기위한 서버create
var server = http.createServer(app);
var io = socketio.listen(server); //퀴즈게임

//cookie값을 json형식으로바꾸는 함수
function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

//첫화면
app.get('/',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){
		response.redirect('/main');
	}else {
		response.redirect('/login')
	}
});

//로그인창
app.get('/login',function(request,response) {
	fs.readFile('LoginPage.html', function(error, data) {
		response.send(data.toString());
	});
});

//순차적인 실행을위한 promise
var promise = new Promise(function(resolve, reject) {
	resolve(1);
});

//로그인창에서 로그인정보 받아왔을때
app.post('/login', function (request,response) {
	var ID = request.body.ID;
	var Pwd = request.body.Pwd;
	
	client.query('select * from accounts',function (err, rows, fields) {
		var idpwcheck = false;   //올바른 계정 인지 아닌지
		//비밀번호 해시 변환
		var shasum = crypto.createHash('sha256');
		shasum.update(Pwd);
		var Pwdhasy = shasum.digest('hex');
		//id 와 pwhasy 비교
		rows.forEach(function(row,i){
			if((ID == row.id)&&(Pwdhasy == row.pwhasy)) {
				//cookie 생성
				response.cookie('userT','common');
				response.cookie('userN',row.N);
				idpwcheck = true;    //올바른 계정이다
			}
		});
		if(idpwcheck) {
			//Common 로그인
			response.redirect('/main');
		}else {
			response.redirect('/loginfail');
		}
	});
});

//로그인 실패시
app.get('/loginfail',function(request,response) {
	fs.readFile('LoginFail.html',function(error, data) {
		response.send(data.toString());
	});
});

//err메시지 정의
var iderr = '';
var pwerr = '';
var pwcheck = '';
var nnerr = '';
//회원가입창
app.get('/join',function(request,response) {
	fs.readFile('JoinPage.ejs', 'utf8', function(error, data) {
		response.writeHead(200, {'Content-Type':'text/html'});
			response.end(ejs.render(data, {
				iderr : iderr,
				pwerr : pwerr,
				pwcheck : pwcheck,
				nnerr : nnerr
			}));
	});
});

//회원가입정보 받아왔을때
app.post('/join',function(request,response) {
	var nID = request.body.nID;
	var nPwd = request.body.nPwd;
	var nPwdCheck = request.body.nPwdCheck;
	var nNickName = request.body.nNickName;
	if(nID=="") {
		iderr = '공백 아이디 불가능';
		pwerr = '';
		pwcheck = '';
		nnerr = '';
		//공백 아이디 불가능
		response.redirect('/join');
	}else if(nPwd=="") {
		iderr = '';
		pwerr = '공백 패스워드 불가능';
		pwcheck = '';
		nnerr = '';
		//공백 패스워드 불가능
		response.redirect('/join');
	}else if(nPwd != nPwdCheck){
		iderr = '';
		pwerr = '';
		pwcheck = '패스워드가 일치하지 않습니다';
		nnerr = '';
		//패스워드가 틀렷습니다.
		response.redirect('/join');
	}else if(nNickName=="") {
		iderr = '';
		pwerr = '';
		pwcheck = '';
		nnerr = '공백닉네임 불가능';
		//공백 닉네임 불가능
		response.redirect('/join');
	}else{
		client.query('select * from accounts',function (err, rows, fields) {
			var idsame = 0;    //아이디 존재유무
			var nnsame = 0;    //닉네임 존재유무
			rows.forEach(function(row,i){
				if(nID == row.id) {
					idsame = 1;
				} else if(nNickName == row.nickname) {
					nnsame = 1;					
				}
			});
			if(idsame == 1){
				iderr = '이미 존재하는 아이디입니다.';
				pwerr = '';
				pwcheck = '';
				nnerr = '';
				//아이디가 존재합니다.
				response.redirect('/join');			
			} else if(nnsame == 1) {
				iderr = '';
				pwerr = '';
				pwcheck = '';
				nnerr = '이미 존재하는 닉네임입니다.';
				//닉네임이 존재합니다.
				response.redirect('/join');
			} else {
				//암호화
				var shasum = crypto.createHash('sha256');
				shasum.update(nPwd);
				var nPwdhasy = shasum.digest('hex');
				client.query('INSERT INTO accounts (id, pwhasy, nickname) VALUES (?, ?, ?)',
				 [nID, nPwdhasy, nNickName], function () {	});
				//회원가입완료창
				response.redirect('/JoinSuccess');
			}
		});
	}
});

//회원가입 완료
app.get('/JoinSuccess',function(request,response) {
	fs.readFile('JoinSuccess.html',function(error, data) {
		response.send(data.toString());
	});
});

//MainPage
//userN쿠키읽어서 데이터베이스에서 닉네임 퀴즈점수 오목점수 불러와서 ejs파일로 보내서 출력
app.get('/main',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT=='common') {
		console.log('common');
		client.query('select * from accounts',function (err, rows, fields) {
			rows.forEach(function(row,i){
					if(row.N == Number(UserData.userN)) { //유저쿠키값의 유저번호로 DB에서 유저정보 읽기

						fs.readFile('MainPage.ejs', 'utf8', function(error, data) {
							//ejs파일로 유저정보 나타내기
							response.writeHead(200, {'Content-Type':'text/html'});
							response.end(ejs.render(data, {
								NickName : row.nickname,
								QuizPoint : row.QuizPoint,
								OmokPoint : row.OmokPoint
							}));
						});
					}
				});
		});
	}else { //UserData가 없을때.
		console.log('index');
		response.redirect('/');
	}
});

//Quiz Page
app.get('/Quiz',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		client.query('select * from accounts',function (err, rows, fields) {
			rows.forEach(function(row,i){
					if(row.N == Number(UserData.userN)) { //유저쿠키값의 유저번호로 DB에서 유저정보 읽기

						fs.readFile('QuizPage.ejs', 'utf8', function(error, data) {
							//ejs파일로 유저정보 나타내기
							response.writeHead(200, {'Content-Type':'text/html'});
							response.end(ejs.render(data, {
								NickName : row.nickname,
								QuizPoint : row.QuizPoint,
								OmokPoint : row.OmokPoint
							}));
						});
					}
				});
		});
	}else{
		response.redirect('/login');
	}
});

//QSB err message
//Quiz Submit Page :QSP
app.get('/QSP',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		fs.readFile('QSP.ejs', 'utf8', function(error, data) {
			client.query('SELECT * FROM Quizs', function(error,results) {
				response.writeHead(200, {'Content-Type':'text/html'});
				response.end(ejs.render(data, {
					quizs : results,
					userN : UserData.userN,
				}));
			});
		});
	}else{
		response.redirect('/login');
	}
});

//퀴즈 제출 받았을떄
app.post('/QSP',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		if(request.body.Question!=""){
				client.query('INSERT INTO Quizs (Question, Answer, Genre) VALUES (?, ?, ?)',
					 [request.body.Question, request.body.Answer, request.body.Genre], function () {	});
		}
		//퀴즈 승인
		client.query('UPDATE Quizs SET Permisson = 1 WHERE N = ?',[request.body.Per],function() { });


		//QSP로 돌아가기
		response.redirect('/QSP');
	}else{
		response.redirect('/login');
	}
});

//Create Quiz Room Page : CQR
var CQRerr = '';
app.get('/CQR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		fs.readFile('CQR.ejs', 'utf8', function(error, data) {
			client.query('SELECT * FROM QuizRooms ORDER BY N DESC', function(error,results) {
				var N = 0;
				if(results[0]===undefined){
					client.query('ALTER TABLE QuizRooms AUTO_INCREMENT=1', function(){});
					N = 1;
				}
				else{ N = results[0].N+1; }
				response.writeHead(200, {'Content-Type':'text/html'});
				response.end(ejs.render(data, {
					roomnumber : N,
					CQRerr : CQRerr
				}));
			});
		});
	}else{
		response.redirect('/login');
	}
});

//Into Quiz Room : IQR
app.get('/IQR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		fs.readFile('IQR.ejs', 'utf8', function(error, data) {
			client.query('SELECT * FROM QuizRooms', function(error,results) {
				response.writeHead(200, {'Content-Type':'text/html'});
				response.end(ejs.render(data, {
					room : results
				}));
			});
		});
	}else{
		response.redirect('/login');
	}
});

roomnumber = 0;
headcheck = 0;
app.post('/CQR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		if(request.body.quest>15){
			CQRerr = '최대문제수는 15입니다.';
			response.redirect('/CQR');
		}else if(request.body.seat>6){
			CQRerr = '최대인원은 6명입니다.';
			response.redirect('/CQR');
		}else if(request.body.seat<1){
			CQRerr = '최소인원은 1명입니다.';
			response.redirect('/CQR');
		}else if(request.body.roomname && request.body.genre && request.body.quest && request.body.seat){
		client.query('INSERT INTO QuizRooms (name, genre, quest, seat) VALUES (?, ?, ?, ?)',
			[request.body.roomname, request.body.genre, request.body.quest, request.body.seat],
			function (error, result) {
				//CQRerr메시지
				CQRerr = '';
			 	roomnumber = request.body.roomnumber;
			 	room = request.body;
			 	//방만든사람은 방장!
			 	headcheck = 1;
			 	//퀴즈게임 입장
			 	response.redirect('/QuizGame');
			});
		}else{
			CQRerr = '입력값이 부족합니다.';
			response.redirect('/CQR');
		}
	}else{
		response.redirect('/login');
	}
});

app.post('/IQR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		roomnumber = request.body.which;
		//참가자는 방장아님!
		headcheck = 0;
		client.query('SELECT * FROM QuizRooms WHERE N = ?', [roomnumber], function(error,result) {
			if(result[0]===undefined){
				response.redirect('/IQR');
			}else{
				if(result[0].playing==1){
					//게임중엔 입장불가
					response.redirect('/IQR');
				}else if(result[0].people<result[0].seat){
					//퀴즈게임 입장
					response.redirect('/QuizGame');
				}else{
					response.redirect('/IQR');
				}
			}
		});
	}else{
		response.redirect('/login');
	}
});

app.get('/QuizGame', function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		if(roomnumber==0){
			response.redirect('/IQR')
		}else {
			fs.readFile('QuizGame.ejs', 'utf8', function(error, data) { //퀴즈게임 입장
				client.query('SELECT * FROM QuizRooms WHERE N = ?', [roomnumber], function(error,result1) {
					client.query('SELECT * FROM accounts WHERE N = ?', [UserData.userN], function(error,result2) {
						response.writeHead(200, {'Content-Type':'text/html'});
						response.end(ejs.render(data, {
							room : result1,
							headcheck : headcheck,
							user : result2//[N,nickname,QuizPoint]
						}));
					});
				});
			});
		}
	}else{
		response.redirect('/login');
	}
});


//Omok Page
app.get('/Omok',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		client.query('select * from accounts',function (err, rows, fields) {
			rows.forEach(function(row,i){
					if(row.N == Number(UserData.userN)) { //유저쿠키값의 유저번호로 DB에서 유저정보 읽기

						fs.readFile('OmokPage.ejs', 'utf8', function(error, data) {
							//ejs파일로 유저정보 나타내기
							response.writeHead(200, {'Content-Type':'text/html'});
							response.end(ejs.render(data, {
								NickName : row.nickname,
								QuizPoint : row.QuizPoint,
								OmokPoint : row.OmokPoint
							}));
						});
					}
				});
		});
	}else{
		response.redirect('/login');
	}
});

//Create Omok Room Page : COR
app.get('/COR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		fs.readFile('COR.ejs', 'utf8', function(error, data) {
			client.query('SELECT * FROM OmokRooms ORDER BY N DESC', function(error,results) {
				var N = 0;
				if(results[0]===undefined){
					client.query('ALTER TABLE OmokRooms AUTO_INCREMENT=1', function(){});
					N = 1;
				}
				else{ N = results[0].N+1; }
				response.writeHead(200, {'Content-Type':'text/html'});
				response.end(ejs.render(data, {
					roomnumber : N
				}));
			});
		});
	}else{
		response.redirect('/login');
	}
});

//Into Quiz Room : IQR
app.get('/IOR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		fs.readFile('IOR.ejs', 'utf8', function(error, data) {
			client.query('SELECT * FROM OmokRooms', function(error,results) {
				response.writeHead(200, {'Content-Type':'text/html'});
				response.end(ejs.render(data, {
					room : results
				}));
			});
		});
	}else{
		response.redirect('/login');
	}
});

Oroomnumber = 0;
app.post('/COR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		client.query('INSERT INTO OmokRooms (name) VALUES (?)',
			[request.body.roomname],
			function (error, result) {
			 	Oroomnumber = request.body.roomnumber;
			 	room = request.body;
			 	//오목게임 입장
			 	response.redirect('/OmokGame');
		});
	}else{
		response.redirect('/login');
	}
});

app.post('/IOR',function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		Oroomnumber = request.body.which;
		client.query('SELECT * FROM OmokRooms WHERE N = ?', [Oroomnumber], function(error,result) {
			if(result[0]===undefined){
				response.redirect('/IOR')
			}else{
				if(result[0].playing==1){
					//게임중엔 입장불가
					response.redirect('/IOR');
				}else if(result[0].people<result[0].seat){
					//오목게임 입장
					response.redirect('/OmokGame');
				}else{
					response.redirect('/IOR');
				}
			}
		});
	}else{
		response.redirect('/login');
	}
});

app.get('/OmokGame', function(request,response) {
	var UserData = parseCookies(request);
	if(UserData.userT&&UserData.userN){ //쿠키값 확인
		if(Oroomnumber==0){
			response.redirect('/IOR')
		}else {
			fs.readFile('OmokGame.ejs', 'utf8', function(error, data) { //오목게임 입장
				client.query('SELECT * FROM OmokRooms WHERE N = ?', [Oroomnumber], function(error,result1) {
					client.query('SELECT * FROM accounts WHERE N = ?', [UserData.userN], function(error,result2) {
						response.writeHead(200, {'Content-Type':'text/html'});
						response.end(ejs.render(data, {
							room : result1,
							user : result2//[N,nickname,OmokPoint]
						}));
					});
				});
			});
		}
	}else{
		response.redirect('/login');
	}
});


/////////////////////////socket linked/////////////////////////////////////

//userlist for QuizGame
var userList = new Array();
//문제 수
var quest;
//퀴즈 답안
var Answer = "urtctvfy08u90un9dxss3";

//Ouserlist for OmokGame
var OuserList = new Array();

//오목판
var board=[
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		    [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
		];
//playing Omok?
var PlayOmok = false;
//오목 나중에 들어온사람
var lastid;
//승리체크 함수
function Victor()
	{
		for (var i = 0; i < 10; i++)
		{
			for (var j = 0; j < 10; j++)
			{
				if (board[i][j] != 0)
				{
					if (
						((board[i][j] == board[i][j + 1]) && (board[i][j] == board[i][j + 2]) && (board[i][j] == board[i][j + 3]) && (board[i][j] == board[i][j + 4]))
						|| ((board[i][j] == board[i + 1][j]) && (board[i][j] == board[i + 2][j]) && (board[i][j] == board[i + 3][j]) && (board[i][j] == board[i + 4][j]))
						|| ((board[i][j] == board[i + 1][j + 1]) && (board[i][j] == board[i + 2][j + 2]) && (board[i][j] == board[i + 3][j + 3]) && (board[i][j] == board[i + 4][j + 4]))
						|| ((board[i][j] == board[i + 1][j - 1]) && (board[i][j] == board[i + 2][j - 2]) && (board[i][j] == board[i + 3][j - 3]) && (board[i][j] == board[i + 4][j - 4]))
						)
					{
						return board[i][j];
					}
				}
			}
		}
		return 0;
	}
//socket linked for QuizGame
io.sockets.on('connection', function(socket) {
	var roomName = null;  //퀴즈방넘버
	var roomGenre = "";   //퀴즈방장르
	var userinfo;	//N, nickname, QuizPoint 가저장됨
	var OroomName;  //오목방넘버
    var ouserinfo;   //N, nickname 이저장됨

	socket.on('join', function (data) {
		PlayOmok=false;
		//인원 증가
		client.query('UPDATE QuizRooms SET people = people + 1 WHERE N = ?',[data.roomName],function() { });
		//ingame점수 초기화
		client.query('UPDATE accounts SET ingameQpoint = 0 WHERE N = ?',[data.userInfo[0]],function() { });
		//userList에 추가
		userinfo = data.userInfo;
		userList.push(data.userInfo[0]);
		//방번호 저장
		roomName = data.roomName;
		//방의 문제 장르 추출
		client.query('select * from QuizRooms where N = ?', [data.roomName], function(error,result) {
			//방 장르 저장
			roomGenre = result[0].genre;
		});
		socket.join(roomName);
		//환영 인사
		io.sockets.in(roomName).emit('joinAccount', userinfo[1] );
		//플레이어 업데이트
		client.query('select * from accounts',function(error,results){
			io.sockets.in(roomName).emit('update player',{
				index : userList,
				list : results
			})
		});
	});

	socket.on('message', function(data){
		PlayOmok=false;
		if(data == Answer){
			io.sockets.in(roomName).emit('message', { 
				nickname : '정답 -> '+userinfo[1],
				msg : data+' <- '
			});
			client.query('UPDATE accounts SET ingameQpoint = ingameQpoint + 1 WHERE N = ?',[userinfo[0]],function() { });
			if(quest > 0){
				//남은 문제수 감소
				quest = quest-1;
				console.log('left Q : '+quest);
				if(roomGenre=="all"){ //모든장르
					client.query('select * from Quizs where Permisson = 1 order by rand() limit 1', [roomGenre], function(error,result) {
						//Answer Set
						Answer = result[0].Answer;
						io.sockets.in(roomName).emit('question set',result);
					});
				}else{ //특정장르
					client.query('select * from Quizs where Permisson = 1 && Genre = ? order by rand() limit 1', [roomGenre], function(error,result) {
						//Answer Set
						Answer = result[0].Answer;
						io.sockets.in(roomName).emit('question set',result);
					});
				}
			}else{
				//QuizRoom not Playing Game
				client.query('UPDATE QuizRooms SET playing = 0 WHERE N = ?',[roomName],function() { });
				client.query('SELECT * FROM accounts WHERE N = ? || N = ? || N = ? || N = ? || N = ? || N = ? ORDER BY ingameQpoint ASC', [userList[0],userList[1],userList[2],userList[3],userList[4],userList[5]], function(error,result) {
					//결과에 따른 점수 배분
					if(result[0]===undefined){ var A = "" }else{ var A = result[0].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 10 WHERE N = ?',[result[0].N],function() { });}
					if(result[1]===undefined){ var B = "" }else{ var B = result[1].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 20 WHERE N = ?',[result[1].N],function() { });}
					if(result[2]===undefined){ var C = "" }else{ var C = result[2].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 30 WHERE N = ?',[result[2].N],function() { });}
					if(result[3]===undefined){ var D = "" }else{ var D = result[3].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 40 WHERE N = ?',[result[3].N],function() { });}
					if(result[4]===undefined){ var E = "" }else{ var E = result[4].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 50 WHERE N = ?',[result[4].N],function() { });}
					if(result[5]===undefined){ var F = "" }else{ var F = result[5].nickname ; client.query('UPDATE accounts SET QuizPoint = QuizPoint + 60 WHERE N = ?',[result[5].N],function() { });}
					io.sockets.in(roomName).emit('game end',{
						one : F,
						two : E,
						three : D,
						four : C,
						five : B,
						six : A
					});
				});
			}
		}else{
			io.sockets.in(roomName).emit('message', { 
				nickname : userinfo[1],
				msg : data
			});
		}
	});

	socket.on('gamestart',function(RN) {
		io.sockets.in(roomName).emit('QuizStart','');
		PlayOmok=false;
		//QuizRoom Playing Game
		client.query('UPDATE QuizRooms SET playing = 1 WHERE N = ?',[roomName],function() { });
		quest = RN;
		//남은 문제수 감소
		quest = quest-1;
		console.log('left Q : '+quest);
		if(roomGenre=="all"){ //모든장르
			client.query('select * from Quizs where Permisson = 1 order by rand() limit 1', [roomGenre], function(error,result) {
				//Answer Set
				Answer = result[0].Answer;
				io.sockets.in(roomName).emit('question set',result);
			});
		}else{ //특정장르
			client.query('select * from Quizs where Permisson = 1 && Genre = ? order by rand() limit 1', [roomGenre], function(error,result) {
				//Answer Set
				Answer = result[0].Answer;
				io.sockets.in(roomName).emit('question set',result);
			});
		}
	});


/*******************************Omok Game*******************************************************/
	socket.on('Ojoin', function (data) {
		//play Omok
        PlayOmok = true;
		//마지막으로 들어온사람 체크
		lastid=socket.id
        //인원 증가
        client.query('UPDATE OmokRooms SET people = people + 1 WHERE N = ?',[data.roomName],function() { });
        //OuserList에 추가
        ouserinfo = data.userInfo;
        OuserList.push(data.userInfo[0]);
        //방번호 저장
        OroomName = data.roomName;
        socket.join("Omok"+OroomName);
        //플레이어 업데이트
        client.query('select * from accounts',function(error,results){
            io.sockets.in("Omok"+OroomName).emit('update Oplayer',{
                index : OuserList,
                list : results
            })
        });
    })

    socket.on('Omessage', function(data){
        //play Omok
        PlayOmok = true;
        io.sockets.in("Omok"+OroomName).emit('Omessage', { 
            nickname : ouserinfo[1],
            msg : data
        });
    });

    socket.on('Ogamestart',function() {
        //play Omok
        PlayOmok = true;
		//OmokRoom Playing Game
		client.query('UPDATE OmokRooms SET playing = 1 WHERE N = ?',[OroomName],function() { });
		board = [
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				    [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				];
		io.sockets.in("Omok"+OroomName).emit('startmsg',"amu");
		socket.broadcast.to("Omok"+OroomName).emit('boardset', board);
	});

    socket.on('put',function(where){
        //play Omok
        PlayOmok = true;
    	if(socket.id==lastid){ //2P이면
    		board[where.row][where.col]=2;
    		//누구차례인지 알아오기
    		socket.broadcast.to("Omok"+OroomName).emit('WhoTurn');
    	}else{  //1P이면
    		board[where.row][where.col]=1;
    		//누구차례인지 알아오기
    		socket.broadcast.to("Omok"+OroomName).emit('WhoTurn');
    	}
    	if(Victor()!=0){ // Win
    		io.sockets.to(socket.id).emit('ImWin');
    		io.sockets.in("Omok"+OroomName).emit('disabled',board);
    		io.sockets.in("Omok"+OroomName).emit('endOgame',Victor());
    	}else{
	    	io.sockets.to(socket.id).emit('disabled',board);
	    	socket.broadcast.to("Omok"+OroomName).emit('boardset', board);
	    }
    });

    socket.on('WhoTurn',function(NN){
    	io.sockets.in("Omok"+OroomName).emit('turn',NN);
    })

    socket.on('ImWin',function(winner){
    	client.query('UPDATE accounts SET OmokPoint = OmokPoint + 10 WHERE N = ?',[winner],function() { });
    })

////////////disconnection event//////////////////////////////////
	socket.on('disconnect', function(data) {
		if(PlayOmok){
			//접속해제
			var i = OuserList.indexOf(ouserinfo[0]);
			OuserList.splice(i,1);
			client.query('UPDATE OmokRooms SET people = people - 1 WHERE N = ?',[OroomName],function() { });
			//방에 유저가없으면 방삭제
			client.query('DELETE FROM OmokRooms WHERE N = ? && people = 0',[OroomName],function() { });
			//플레이어 업데이트
			io.sockets.in("Omok"+OroomName).emit('update Oplayer',OuserList);
		}else{
			//접속해제
			var i = userList.indexOf(userinfo[0]);
			userList.splice(i,1);
			client.query('UPDATE QuizRooms SET people = people - 1 WHERE N = ?',[roomName],function() { });
			//방에 유저가없으면 방삭제
			client.query('DELETE FROM QuizRooms WHERE N = ? && people = 0',[roomName],function() { });
			//플레이어 업데이트
			io.sockets.in(roomName).emit('update player',userList);
		}
	});
});

server.listen(52273, function() {
	console.log('Server Running at http://192.168.200.133:52273');
});