import Phaser from 'phaser';

class UIScene extends Phaser.Scene {

  private platforms: Phaser.Physics.Arcade.StaticGroup | null;
  private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  /*
   * - Dynamic Body: 중력, 속도, 충동하면 질량에 따라 움직임. 예) 사람, 차
   * - Static Body: 고정, 충돌해도 움직이지 않음. 예) 벽
   */
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null | undefined;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key };
  private stars: Phaser.Physics.Arcade.Group | null;

  private scoreText: Phaser.GameObjects.Text | null;

  private bombs: Phaser.Physics.Arcade.Group | null;
  private score: integer;
  private gameOver: boolean;

  constructor () {
    super({ key: 'ui' });

    this.platforms = null;
    this.player = null;
    this.cursors = null;
    this.stars = null;
    this.bombs = null;
    this.scoreText = null;
    this.score = 0;
    this.gameOver = false;
  }

  preload(): void {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 }); // 32x48 단위로 잘라내기
  }
  
  create(): void {
    this.add.image(400, 300, 'sky');
    // this.add.image(400, 300, 'sky').setOrigin(0, 0); // 중점(400, 300)
    
    // 발판, 바닥 설정
    this.platforms = this.physics.add.staticGroup(); // Physics Group > Static Group
    this.platforms.create(400, 568, 'ground') // 바닥 
      .setScale(2) // 중점을 기준으로 2배로 늘리기(상하좌우로 늘림), ground 이미지의 사이즈(400x32)를 두배(800x64)로 (400,568)에 위치, (568=600-32) 중점을 32만큼 위로 올려서 높이 64를 적용하는 의미
      .refreshBody(); // 변경된 내용을 적용
    this.platforms.create(600, 400, 'ground'); // 오른쪽 하단
    this.platforms.create(50, 250, 'ground'); // 왼쪽 상단
    this.platforms.create(750, 220, 'ground'); // 오른쪽 상단

    // 플레이어
    this.player = this.physics.add.sprite(100, 450, 'dude'); // 이미지가 생성되는 위치
    this.player.setBounce(0.2); // 통통 튕기는 이벤트
    this.player.setCollideWorldBounds(true); // true: 화면에 안에 고정
    this.player.body.setGravityY(600)

    // 애니메이션 설정: 왼쪽 움직임
    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), // 이미지 0 ~ 3 번째
      frameRate: 10, // 초당 10프레임
      repeat: -1 // 애니메이션 반복
    });

    // 애니메이션 설정: 정면 응시
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ], // 이미지 4번째
        frameRate: 20, // 초당 20프레임
    });

    // 애니메이션 설정: 오른쪽 움직임
    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), // 이미지 5 ~ 8 번째
      frameRate: 10, // 초당 10프레임
      repeat: -1 // 애니메이션 반복
    });

    // 키 이벤트
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    // 별 
    this.stars = this.physics.add.group({
      key: 'star',
      repeat: 11,
      setXY: { x: 12, y: 0, stepX: 70 },
      gravityY: 500,
    });
    this.stars.children.iterate((child: any): any => {
      child.setBounceY(Phaser.Math.FloatBetween(0.3, 0.5));
    });

    // 폭탄
    this.bombs = this.physics.add.group();

    // 스코어
    this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

    // 충돌처리: 플레이어 -> 플랫폼
    this.physics.add.collider(this.player, this.platforms);
    // 충돌처리: 별 -> 플랫폼
    this.physics.add.collider(this.stars, this.platforms);
    // 충돌처리: 폭탄 -> 플랫폼
    this.physics.add.collider(this.bombs, this.platforms);
    // 충돌처리: 폭탄 -> 폭탄
    this.physics.add.collider(this.bombs, this.bombs);

    // 겹치기: 플레이어 <-> 별
    this.physics.add.overlap(this.player, this.stars, (p, s) => {
      s.disableBody(true, true); // 별 숨기기

      // 스코어 처리
      this.score += 10;
      this.scoreText?.setText('Score: ' + this.score);

      // 별이 모두 사라지면, 재생성
      if ( this.stars?.countActive(true) === 0 ){
        //  A new batch of stars to collect
        this.stars.children.iterate(function(child) {
          child.enableBody(true, child.x, 0, true, true); // 별 보이기
        });
      }
    }, undefined, this);

    // 겹치기: 플레이어 <-> 폭탄
    this.physics.add.collider(this.player, this.bombs, (p, b) => {
      // this.physics.pause(); // 물리 엔진 중단

      // b.destroy(); // 폭탄 삭제
  
      p.setTint(0xff0000); // 플레이어를 붉은색으로 표시
  
      p.anims.play('turn'); // 플레이어를 정면으로 회전
  
      this.gameOver = true; // 게임 종료

    }, undefined, this);
    
    this.time.addEvent({
      delay: 1000, // 밀리초 단위 지연시간 (2초)
      callback: function(): void {
        var x = (this.player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        var bomb = this.bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = true;
      }, // 호출할 함수
      callbackScope: this, // 함수 호출 시의 this 컨텍스트
      loop: true // 반복 실행 여부
    });

  }

  update(): void {
    // if ( this.gameOver ) return;

    let player = this.player;
    let cursors = this.cursors;
    let keys = this.keys;

    if( player && cursors && keys ){
      const leftDown = (cursors.left.isDown || keys.left.isDown);
      const rightDown = (cursors.right.isDown || keys.right.isDown);
      const upDown = (cursors.up.isDown || keys.up.isDown);
      const tocuhingDown = (player.body.touching.down);

      if ( leftDown ){
        player.setVelocityX(-160); // 수평속도: Velocity: 속도

        player.anims.play('left', true);
      } else if ( rightDown ) {
        player.setVelocityX(160); // 수평속도

        player.anims.play('right', true);
      } else {
        player.setVelocityX(0); // 수평속도

        player.anims.play('turn');
      }

      if ( upDown && tocuhingDown ) { // 바닥에 있는 경우에만 점프
          player.setVelocityY(-600); // 수직속도,  330px/sec
      }
    }
  }

}

export default UIScene;