import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import eas from '../../eas.json';
import app from '../../app.json';
import manifest from '../../package.json';

const loadCjs = createRequire(__filename);
const { validateConfig, inspectBuild, verifyBackend } = loadCjs('../../scripts/eas-production.cjs');
const yaml = loadCjs('js-yaml');
const root = path.resolve(__dirname, '../..');
const sha = 'a'.repeat(40);
const good = () => ({ id:'11111111-1111-4111-8111-111111111111', platform:'ANDROID', buildProfile:'production', status:'FINISHED',
  distribution:'STORE', appBuildVersion:'18', gitCommitHash:sha, app:{id:app.expo.extra.eas.projectId,slug:'pry-app-tsg',ownerAccount:{name:'synthetic-owner'}},
  artifacts:{applicationArchiveUrl:'https://artifacts.example.test/application.aab?signature=private-test-value'} });

it('validates the production profile independently of preview and rejects unsafe overrides', () => {
  expect(validateConfig(eas,app.expo,manifest).format).toBe('aab');
  for (const mutation of [
    (value: typeof eas) => { value.build.production.android.buildType='apk'; },
    (value: typeof eas) => { value.build.production.env.EXPO_PUBLIC_ARCO_BACKEND_ENABLED='false'; },
    (value: typeof eas) => { value.build.production.env.EXPO_PUBLIC_API_URL='http://server-titanium.onrender.com'; },
    (value: typeof eas) => { value.build.production.autoIncrement=false; },
  ]) {
    const copy=structuredClone(eas); mutation(copy); expect(()=>validateConfig(copy,app.expo,manifest)).toThrow();
  }
});
it('accepts only a finished production AAB for the exact EAS project and commit, without exposing signed URLs', () => {
  const result=inspectBuild(good(),sha);
  expect(result).toMatchObject({format:'aab',remoteStatus:'FINISHED',versionCode:'18'});
  expect(JSON.stringify(result)).not.toMatch(/signature|private-test-value|applicationArchiveUrl/);
  for (const field of ['ERRORED','CANCELED','IN_PROGRESS','IN_QUEUE']) expect(()=>inspectBuild({...good(),status:field},sha)).toThrow();
  expect(()=>inspectBuild({...good(),buildProfile:'preview'},sha)).toThrow();
  expect(()=>inspectBuild({...good(),gitCommitHash:'b'.repeat(40)},sha)).toThrow();
  expect(()=>inspectBuild({...good(),app:{...good().app,id:'other-project'}},sha)).toThrow();
  expect(()=>inspectBuild({...good(),artifacts:{applicationArchiveUrl:'https://artifacts.example.test/application.apk'}},sha)).toThrow();
  expect(()=>inspectBuild({...good(),artifacts:{applicationArchiveUrl:'http://artifacts.example.test/application.aab'}},sha)).toThrow();
});
it('checks backend health, approved notice and ARCO contract using public GET requests only', async () => {
  const paths: string[]=[];
  const fetcher=jest.fn(async(url:string,init:RequestInit)=>{
    paths.push(url); expect(init.redirect).toBe('error'); expect(init.credentials).toBe('omit'); expect(init.body).toBeUndefined();
    const data=url.endsWith('/health')?{ok:true}:url.endsWith('/notice')?{noticeId:'privacy-notice',version:'fixture',contentSha256:'a'.repeat(64),documentUrl:'https://example.test/notice.pdf'}:
      url.endsWith('/capabilities')?{schemaVersion:2,databaseReady:true,cancellationStatusLookup:true,googleEmailStepUp:true,deletionRequiresApprovedPolicy:true}:{code:'UNAUTHORIZED'};
    return {status:url.endsWith('account-cancellation-requests')?401:200,json:async()=>data};
  });
  await expect(verifyBackend(fetcher)).resolves.toMatchObject({reviewApi:'v2'}); expect(paths).toHaveLength(4);
  await expect(verifyBackend(async()=>{throw new Error('private-certificate-details');})).rejects.toThrow('No se pudo verificar el backend por HTTPS.');
  await expect(verifyBackend(async()=>({status:503}))).rejects.toThrow();
  await expect(verifyBackend(async(url:string,init:RequestInit)=>{
    const response=await fetcher(url,init);
    return url.endsWith('/capabilities')?{status:200,json:async()=>({schemaVersion:2,databaseReady:false,cancellationStatusLookup:true,googleEmailStepUp:true,deletionRequiresApprovedPolicy:true})}:response;
  })).rejects.toThrow();
});
it('production workflow is manual, gates the build on quality and never submits to Play', () => {
  const source=readFileSync(path.join(root,'.github/workflows/eas-production.yml'),'utf8');
  const workflow=yaml.load(source);
  expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  expect(workflow.permissions).toEqual({contents:'read'});
  expect(workflow.jobs.build.needs).toBe('calidad');
  const quality=workflow.jobs.calidad.steps.map((step:{run?:string})=>step.run??'').join('\n');
  for(const required of ['npm ci','npm run lint','tsc --noEmit','test:unit','test:integration','test:acceptance','verify-android-release','eas-production.cjs backend']) expect(quality).toContain(required);
  expect(source).toContain('--profile production --non-interactive --freeze-credentials --wait --json');
  expect(source).toContain('secrets.EXPO_TOKEN'); expect(source).toContain('GITHUB_STEP_SUMMARY');
  expect(source).not.toMatch(/--auto-submit|eas submit/);
});
