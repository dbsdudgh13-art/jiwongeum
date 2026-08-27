// 저장소를 새로 받은 뒤 한 번 실행한다.
// git 훅 경로는 복제되지 않으므로(로컬 설정) 여기서 켜 준다.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
console.log('pre-commit 훅 활성화. 인증키가 섞인 커밋을 차단한다.');

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('.env 생성. 편집기로 열어 DATA_GO_KR_KEY 를 채워라.');
  console.log('명령줄에 붙여넣지 마라. 셸 히스토리에 남는다.');
} else {
  console.log('.env 이미 있음. 건드리지 않는다.');
}
