// Componente personalizado para manejar listas de arrays en AdminJS
import React from 'react'
import { Box, Button, Section, Icon } from '@adminjs/design-system'
import { useRecord, useTranslation } from 'adminjs'

import CustomArrayItem from './custom-array-item'

const CustomArrayList = (props) => {
  const { property, ItemComponent } = props
  const { record, onChange } = useRecord()
  const { translateProperty } = useTranslation()

  const items = record.params[property.path] || []

  // Agregar un nuevo item al array
  const handleAdd = () => {
    const newItem = property.subProperties.reduce((memo, subProperty) => {
      // Si es _id, generamos uno temporal para rastrear el elemento
      if (subProperty.name === '_id') {
        memo[subProperty.name] = new Date().getTime().toString()
      } else {
        memo[subProperty.name] = ''
      }
      return memo
    }, {})
    
    onChange(property.path, [...items, newItem])
  }

  return (
    <Box marginBottom="xl">
      <Section>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center"
          marginBottom="lg"
        >
          <Box>
            <h3>{translateProperty(property.path)}</h3>
            {property.description && (
              <p>{property.description}</p>
            )}
          </Box>
          <Button 
            onClick={handleAdd}
            rounded
          >
            <Icon icon="Add" />
            Agregar
          </Button>
        </Box>
        
        {items.length === 0 ? (
          <Box>No hay items</Box>
        ) : (
          <Box>
            {items.map((item, i) => (
              <CustomArrayItem
                key={`${property.path}.${i}`}
                property={property}
                itemIndex={i}
                record={record}
                onChange={onChange}
                ItemComponent={ItemComponent}
              />
            ))}
          </Box>
        )}
      </Section>
    </Box>
  )
}

export default CustomArrayList
