import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**'] },
  ...vue.configs['flat/recommended'],
  // `<script setup lang="ts">` y archivos .ts necesitan el parser de TypeScript.
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser, sourceType: 'module', extraFileExtensions: ['.vue'] } } },
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser, sourceType: 'module' } },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      // Reglas solo de maquetación: el proyecto usa plantillas compactas con varios atributos por línea.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-newline': 'off'
    }
  }
];
