import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['dist/**','node_modules/**','projects/**','.tools/**','.data/**','test-results/**','playwright-report/**']},...tseslint.configs.recommended,{rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}});
